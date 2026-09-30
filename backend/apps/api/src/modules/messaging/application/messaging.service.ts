import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { IamRepository, MessagingRepository, OutboxRepository } from '@platform/db';
import type { AuthenticatedUser } from '@platform/contracts';

export const MESSAGE_EDIT_WINDOW_MINUTES = 15;
export const MESSAGE_RATE_LIMIT_COUNT = 30; // messages ...
export const MESSAGE_RATE_LIMIT_WINDOW_SECONDS = 60; // ... per sender per rolling window
export const MESSAGE_MAX_BODY_LENGTH = 8000;

export interface CreateConversationInput {
  type: 'listing_inquiry' | 'lead' | 'support' | 'system';
  listingId?: string | undefined;
  organizationId?: string | undefined;
  memberUserIds: string[];
}

export interface SendMessageInput {
  conversationId: string;
  body?: string | undefined;
  messageType?: 'text' | 'image' | 'file' | 'system' | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Gate 5.1 Phase B — Messaging domain service.
 *
 * Business flows (real implementations, not stubs):
 *  F1 listing_inquiry: a viewer opens a conversation on a published listing;
 *      conversation is scoped to the listing and additional participants
 *      (owner-side) are added by policy.
 *  F2 lead conversation: CRM-created conversations (type 'lead') scoped to
 *      the managing organization; members are agents/clients of the lead.
 *  F3 support: any authenticated user may open a support conversation; the
 *      platform-side member set is managed by admins (messaging.manage).
 *  F4 system: workers/admins post notification conversations (system sender).
 *
 * Authorization scopes (4):
 *  S1 conversation.read        — member only, on every read path (IDOR-safe)
 *  S2 conversation.participate — member only, on every write path
 *  S3 messaging.manage         — admin-level: moderate/delete any message,
 *                                manage members, post system messages
 *  S4 messaging.view           — permission-gated API surface access
 *
 * Delivery/read state: read state is persisted in conversation_members
 * .last_read_at; delivery receipts land in messaging.message_receipts via
 * the realtime ACK path (SSE stream, reconnect-safe by cursor).
 */
@Injectable()
export class MessagingService {
  constructor(
    private readonly messaging: MessagingRepository,
    private readonly outbox: OutboxRepository,
    private readonly iam: IamRepository,
  ) {}

  // ------------------------------------------------------------------ authorization

  private async requirePermission(actor: AuthenticatedUser, permission: 'messaging.view' | 'messaging.manage', organizationId?: string): Promise<void> {
    const permissions = await this.iam.listPermissionCodesForUser(actor.id, organizationId);
    if (!permissions.includes(permission)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: `Required permission is missing: ${permission}` });
    }
  }

  async requireMember(conversationId: string, actorUserId: string): Promise<void> {
    const membership = await this.messaging.getMembership(conversationId, actorUserId);
    if (!membership) {
      // Do not leak existence: same 404 for non-member and missing conversation.
      throw new NotFoundException({ code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found' });
    }
  }

  async requireManage(conversationId: string, actor: AuthenticatedUser): Promise<void> {
    const conversation = await this.messaging.getConversation(conversationId);
    if (!conversation) throw new NotFoundException({ code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found' });
    await this.requireMember(conversationId, actor.id);
    await this.requirePermission(actor, 'messaging.manage', conversation.organization_id ?? undefined);
  }

  // ------------------------------------------------------------------ conversations

  async createConversation(input: CreateConversationInput, actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    await this.requirePermission(actor, 'messaging.view');

    if (input.type === 'listing_inquiry' && !input.listingId) {
      throw new UnprocessableEntityException({ code: 'CONVERSATION_LISTING_REQUIRED', message: 'listing_inquiry conversations require listingId' });
    }
    if (input.type === 'system') {
      // system conversations are created by workers/admins only
      await this.requirePermission(actor, 'messaging.manage');
    }
    if (!input.memberUserIds.includes(actor.id)) {
      // creator is always a member; prevents creating conversations for third parties
      input.memberUserIds = [...input.memberUserIds, actor.id];
    }
    if (input.memberUserIds.length < 2) {
      throw new UnprocessableEntityException({ code: 'CONVERSATION_MIN_MEMBERS', message: 'A conversation requires at least 2 members' });
    }

    const conversation = await this.messaging.createConversation({
      type: input.type,
      listingId: input.listingId,
      organizationId: input.organizationId,
      memberUserIds: input.memberUserIds,
    });

    await this.outbox.append({
      aggregateType: 'messaging_conversation',
      aggregateId: conversation.id,
      eventType: 'MessagingConversationStarted.v1',
      eventVersion: 1,
      payload: {
        conversationId: conversation.id,
        type: conversation.type,
        listingId: conversation.listing_id,
        organizationId: conversation.organization_id,
        memberUserIds: Array.from(new Set(input.memberUserIds)),
        actorUserId: actor.id,
        createdAt: conversation.created_at,
      },
    });
    return { id: conversation.id, type: conversation.type, listingId: conversation.listing_id, organizationId: conversation.organization_id };
  }

  async getConversation(conversationId: string, actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    await this.requireMember(conversationId, actor.id);
    const conversation = await this.messaging.getConversation(conversationId);
    if (!conversation) throw new NotFoundException({ code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found' });
    const members = await this.messaging.listMembers(conversationId);
    const unread = await this.messaging.unreadCountFor(conversationId, actor.id);
    return {
      id: conversation.id,
      type: conversation.type,
      listingId: conversation.listing_id,
      organizationId: conversation.organization_id,
      createdAt: conversation.created_at,
      members: members.map((m) => ({ userId: m.user_id, joinedAt: m.joined_at })),
      unreadCount: unread,
    };
  }

  async listConversations(actor: AuthenticatedUser, limit?: number | undefined): Promise<Array<Record<string, unknown>>> {
    await this.requirePermission(actor, 'messaging.view');
    const rows = await this.messaging.listConversationsForUser(actor.id, { limit: limit ?? 30 });
    return rows.map((c) => ({
      id: c.id,
      type: c.type,
      listingId: c.listing_id,
      organizationId: c.organization_id,
      createdAt: c.created_at,
      lastMessageAt: c.last_message_at,
      lastMessagePreview: c.last_message_preview,
      memberCount: Number(c.member_count),
    }));
  }

  async addMember(conversationId: string, memberUserId: string, actor: AuthenticatedUser): Promise<void> {
    await this.requireManage(conversationId, actor);
    await this.messaging.addMember(conversationId, memberUserId);
  }

  // ------------------------------------------------------------------ messages

  async sendMessage(input: SendMessageInput, actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    await this.requirePermission(actor, 'messaging.view');
    await this.requireMember(input.conversationId, actor.id);

    const messageType = input.messageType ?? 'text';
    if (messageType === 'system') {
      // only messaging.manage may post system messages
      const conversation = await this.messaging.getConversation(input.conversationId);
      await this.requirePermission(actor, 'messaging.manage', conversation?.organization_id ?? undefined);
    }
    if (messageType === 'text') {
      if (!input.body || input.body.trim().length === 0) {
        throw new UnprocessableEntityException({ code: 'MESSAGE_BODY_REQUIRED', message: 'text messages require a body' });
      }
      if (input.body.length > MESSAGE_MAX_BODY_LENGTH) {
        throw new UnprocessableEntityException({ code: 'MESSAGE_BODY_TOO_LONG', message: `body exceeds ${MESSAGE_MAX_BODY_LENGTH} characters` });
      }
    }

    // Rate limit: rolling window per sender, DB-backed (stateless across replicas).
    const recent = await this.messaging.countRecentBySender(actor.id, MESSAGE_RATE_LIMIT_WINDOW_SECONDS);
    if (recent >= MESSAGE_RATE_LIMIT_COUNT) {
      throw new UnprocessableEntityException({ code: 'MESSAGE_RATE_LIMITED', message: 'Too many messages; retry later' });
    }

    const message = await this.messaging.appendMessage({
      conversationId: input.conversationId,
      senderUserId: actor.id,
      messageType,
      body: messageType === 'text' ? input.body : (input.body ?? null),
      metadata: input.metadata,
    });

    await this.outbox.append({
      aggregateType: 'messaging_message',
      aggregateId: message.id,
      eventType: 'MessageSent.v1',
      eventVersion: 1,
      payload: {
        messageId: message.id,
        conversationId: message.conversation_id,
        senderUserId: message.sender_user_id,
        messageType: message.message_type,
        sentAt: message.created_at,
      },
    });
    return { id: message.id, conversationId: message.conversation_id, createdAt: message.created_at };
  }

  async listMessages(conversationId: string, actor: AuthenticatedUser, options: { limit?: number | undefined; before?: string | undefined; after?: string | undefined } = {}): Promise<Array<Record<string, unknown>>> {
    await this.requirePermission(actor, 'messaging.view');
    await this.requireMember(conversationId, actor.id);
    const messages = await this.messaging.listMessages(conversationId, options);
    return this.toApiMessages(messages);
  }

  private toApiMessages(messages: Awaited<ReturnType<MessagingRepository['listMessages']>>): Array<Record<string, unknown>> {
    return messages.map((m) => ({
      id: m.id,
      senderUserId: m.sender_user_id,
      messageType: m.message_type,
      // soft-deleted messages expose metadata only (moderation-recoverable)
      body: m.deleted_at ? null : m.body,
      deleted: m.deleted_at !== null,
      metadata: m.metadata,
      createdAt: m.created_at,
      editedAt: m.edited_at,
    }));
  }

  /** Stream-cursor bootstrap: latest persisted message id (no history dump). */
  async streamCursor(conversationId: string, actor: AuthenticatedUser): Promise<string | undefined> {
    await this.requireMember(conversationId, actor.id);
    const latest = await this.messaging.getLatestMessage(conversationId);
    return latest ? String(latest.id) : undefined;
  }

  /** Stream poll: membership re-checked per poll (revocation-aware), no history. */
  async streamPoll(conversationId: string, actor: AuthenticatedUser, cursor: string | undefined, limit = 50): Promise<Array<Record<string, unknown>>> {
    await this.requireMember(conversationId, actor.id);
    if (!cursor) return [];
    const messages = await this.messaging.listMessages(conversationId, { limit, after: cursor });
    return this.toApiMessages(messages);
  }

  async editMessage(conversationId: string, messageId: string, body: string, actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    await this.requirePermission(actor, 'messaging.view');
    await this.requireMember(conversationId, actor.id);
    const message = await this.messaging.getMessage(messageId);
    if (!message || message.conversation_id !== conversationId) {
      throw new NotFoundException({ code: 'MESSAGE_NOT_FOUND', message: 'Message not found' });
    }
    if (message.sender_user_id !== actor.id) {
      throw new ForbiddenException({ code: 'MESSAGE_EDIT_FORBIDDEN', message: 'only the sender may edit a message' });
    }
    if (message.edited_at !== null || Date.now() - new Date(message.created_at).getTime() > MESSAGE_EDIT_WINDOW_MINUTES * 60_000) {
      throw new UnprocessableEntityException({ code: 'MESSAGE_EDIT_WINDOW_EXPIRED', message: `edits allowed within ${MESSAGE_EDIT_WINDOW_MINUTES} minutes` });
    }
    if (!body || body.trim().length === 0 || body.length > MESSAGE_MAX_BODY_LENGTH) {
      throw new UnprocessableEntityException({ code: 'MESSAGE_BODY_INVALID', message: 'body must be 1..' + MESSAGE_MAX_BODY_LENGTH + ' characters' });
    }
    const updated = await this.messaging.editMessage(messageId, body);
    if (!updated) throw new NotFoundException({ code: 'MESSAGE_NOT_FOUND', message: 'Message not found' });
    await this.outbox.append({
      aggregateType: 'messaging_message',
      aggregateId: updated.id,
      eventType: 'MessageEdited.v1',
      eventVersion: 1,
      payload: { messageId: updated.id, conversationId: updated.conversation_id, editedAt: updated.edited_at },
    });
    return { id: updated.id, editedAt: updated.edited_at };
  }

  async deleteMessage(conversationId: string, messageId: string, actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    await this.requirePermission(actor, 'messaging.view');
    await this.requireMember(conversationId, actor.id);
    const message = await this.messaging.getMessage(messageId);
    if (!message || message.conversation_id !== conversationId) {
      throw new NotFoundException({ code: 'MESSAGE_NOT_FOUND', message: 'Message not found' });
    }
    if (message.sender_user_id !== actor.id) {
      // non-sender deletion = moderation → requires messaging.manage
      const conversation = await this.messaging.getConversation(conversationId);
      await this.requirePermission(actor, 'messaging.manage', conversation?.organization_id ?? undefined);
    }
    const deleted = await this.messaging.softDeleteMessage(messageId);
    if (!deleted) throw new NotFoundException({ code: 'MESSAGE_NOT_FOUND', message: 'Message not found' });
    await this.outbox.append({
      aggregateType: 'messaging_message',
      aggregateId: deleted.id,
      eventType: 'MessageDeleted.v1',
      eventVersion: 1,
      payload: { messageId: deleted.id, conversationId: deleted.conversation_id, deletedAt: deleted.deleted_at, deletedByUserId: actor.id },
    });
    return { id: deleted.id, deletedAt: deleted.deleted_at };
  }

  // ------------------------------------------------------------------ read state / receipts

  async markRead(conversationId: string, actor: AuthenticatedUser, at?: Date): Promise<Record<string, unknown>> {
    await this.requirePermission(actor, 'messaging.view');
    await this.requireMember(conversationId, actor.id);
    const readAt = at ?? new Date();
    await this.messaging.markRead(conversationId, actor.id, readAt);
    await this.outbox.append({
      aggregateType: 'messaging_conversation',
      aggregateId: conversationId,
      eventType: 'ConversationRead.v1',
      eventVersion: 1,
      payload: { conversationId, userId: actor.id, readAt },
    });
    return { conversationId, userId: actor.id, unreadCount: 0 };
  }

  async recordDeliveryReceipt(conversationId: string, messageId: string, actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    await this.requireMember(conversationId, actor.id);
    const message = await this.messaging.getMessage(messageId);
    if (!message || message.conversation_id !== conversationId) {
      throw new NotFoundException({ code: 'MESSAGE_NOT_FOUND', message: 'Message not found' });
    }
    const recorded = await this.messaging.recordReceipt(messageId, actor.id);
    if (recorded) {
      await this.outbox.append({
        aggregateType: 'messaging_message',
        aggregateId: messageId,
        eventType: 'MessageDelivered.v1',
        eventVersion: 1,
        payload: { messageId, conversationId, recipientUserId: actor.id, deliveredAt: new Date() },
      });
    }
    return { messageId, recipientUserId: actor.id, recorded };
  }
}
