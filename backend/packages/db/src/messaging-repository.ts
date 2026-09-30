import { PostgresDatabase, type QueryExecutor } from './postgres-database';

export interface MessagingConversationRow {
  id: string;
  type: string;
  listing_id: string | null;
  organization_id: string | null;
  created_at: Date;
}

export interface MessagingMemberRow {
  conversation_id: string;
  user_id: string;
  joined_at: Date;
  last_read_at: Date | null;
}

export interface MessagingMessageRow {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  message_type: string;
  body: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  edited_at: Date | null;
  deleted_at: Date | null;
}

export interface ConversationSummaryRow extends MessagingConversationRow {
  last_message_at: Date | null;
  last_message_preview: string | null;
  member_count: string;
}

export interface ConversationListOptions {
  limit?: number | undefined;
  before?: string | undefined; // conversation id cursor
}

export interface MessageListOptions {
  limit?: number | undefined;
  before?: string | undefined; // message id cursor (created_at < cursor.created_at)
  after?: string | undefined; // message id cursor (created_at > cursor.created_at)
}

export class MessagingRepository {
  constructor(private readonly db: PostgresDatabase) {}

  // ------------------------------------------------------------------ conversations

  async createConversation(input: {
    type: string;
    listingId?: string | undefined;
    organizationId?: string | undefined;
    memberUserIds: string[];
  }): Promise<MessagingConversationRow> {
    return this.db.transaction(async (client) => {
      const convResult = await client.query<MessagingConversationRow>(
        `INSERT INTO messaging.conversations (type, listing_id, organization_id)
         VALUES ($1, $2::uuid, $3::uuid)
         RETURNING id, type, listing_id, organization_id, created_at`,
        [input.type, input.listingId ?? null, input.organizationId ?? null],
      );
      const conversation = convResult.rows[0];
      if (!conversation) throw new Error('CONVERSATION_INSERT_FAILED');
      const members = Array.from(new Set(input.memberUserIds));
      for (const userId of members) {
        await client.query(
          `INSERT INTO messaging.conversation_members (conversation_id, user_id)
           VALUES ($1::uuid, $2::uuid)
           ON CONFLICT (conversation_id, user_id) DO NOTHING`,
          [conversation.id, userId],
        );
      }
      return conversation;
    });
  }

  async getConversation(id: string, executor: QueryExecutor = this.db): Promise<MessagingConversationRow | null> {
    const r = await executor.query<MessagingConversationRow>(
      `SELECT id, type, listing_id, organization_id, created_at
         FROM messaging.conversations WHERE id = $1::uuid`,
      [id],
    );
    return r.rows[0] ?? null;
  }

  async getMembership(conversationId: string, userId: string, executor: QueryExecutor = this.db): Promise<MessagingMemberRow | null> {
    const r = await executor.query<MessagingMemberRow>(
      `SELECT conversation_id, user_id, joined_at, last_read_at
         FROM messaging.conversation_members
        WHERE conversation_id = $1::uuid AND user_id = $2::uuid`,
      [conversationId, userId],
    );
    return r.rows[0] ?? null;
  }

  async listMembers(conversationId: string, executor: QueryExecutor = this.db): Promise<MessagingMemberRow[]> {
    const r = await executor.query<MessagingMemberRow>(
      `SELECT conversation_id, user_id, joined_at, last_read_at
         FROM messaging.conversation_members
        WHERE conversation_id = $1::uuid
        ORDER BY joined_at ASC`,
      [conversationId],
    );
    return r.rows;
  }

  async addMember(conversationId: string, userId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO messaging.conversation_members (conversation_id, user_id)
       VALUES ($1::uuid, $2::uuid)
       ON CONFLICT (conversation_id, user_id) DO NOTHING`,
      [conversationId, userId],
    );
  }

  async listConversationsForUser(userId: string, options: ConversationListOptions = {}): Promise<ConversationSummaryRow[]> {
    const limit = Math.min(Math.max(options.limit ?? 30, 1), 100);
    const r = await this.db.query<ConversationSummaryRow>(
      `WITH mine AS (
         SELECT conversation_id
           FROM messaging.conversation_members
          WHERE user_id = $1::uuid
       ),
       last_msg AS (
         SELECT m.conversation_id, max(m.created_at) AS last_message_at
           FROM messaging.messages m
          JOIN mine ON mine.conversation_id = m.conversation_id
          WHERE m.deleted_at IS NULL
          GROUP BY m.conversation_id
       )
       SELECT c.id, c.type, c.listing_id, c.organization_id, c.created_at,
              lm.last_message_at,
              (SELECT body FROM messaging.messages m2
                WHERE m2.conversation_id = c.id AND m2.deleted_at IS NULL
                ORDER BY m2.created_at DESC LIMIT 1) AS last_message_preview,
              (SELECT count(*) FROM messaging.conversation_members cm2
                WHERE cm2.conversation_id = c.id) AS member_count
         FROM messaging.conversations c
         JOIN mine ON mine.conversation_id = c.id
         LEFT JOIN last_msg lm ON lm.conversation_id = c.id
        ORDER BY COALESCE(lm.last_message_at, c.created_at) DESC
        LIMIT $2`,
      [userId, limit],
    );
    return r.rows;
  }

  // ------------------------------------------------------------------ messages

  async appendMessage(input: {
    conversationId: string;
    senderUserId: string;
    messageType?: string | undefined;
    body?: string | null | undefined;
    metadata?: Record<string, unknown> | undefined;
  }, executor: QueryExecutor = this.db): Promise<MessagingMessageRow> {
    const r = await executor.query<MessagingMessageRow>(
      `INSERT INTO messaging.messages (conversation_id, sender_user_id, message_type, body, metadata)
       VALUES ($1::uuid, $2::uuid, $3::messaging.message_type, $4, $5::jsonb)
       RETURNING id, conversation_id, sender_user_id, message_type::text AS message_type,
                 body, metadata, created_at, edited_at, deleted_at`,
      [
        input.conversationId,
        input.senderUserId,
        input.messageType ?? 'text',
        input.body ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    const message = r.rows[0];
    if (!message) throw new Error('MESSAGE_INSERT_FAILED');
    return message;
  }

  async getMessage(messageId: string, executor: QueryExecutor = this.db): Promise<MessagingMessageRow | null> {
    const r = await executor.query<MessagingMessageRow>(
      `SELECT id, conversation_id, sender_user_id, message_type::text AS message_type,
              body, metadata, created_at, edited_at, deleted_at
         FROM messaging.messages WHERE id = $1::uuid`,
      [messageId],
    );
    return r.rows[0] ?? null;
  }

  async listMessages(conversationId: string, options: MessageListOptions = {}): Promise<MessagingMessageRow[]> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    if (options.after) {
      // stream/replay path: everything AFTER the cursor, chronological order
      const r = await this.db.query<MessagingMessageRow>(
        `SELECT id, conversation_id, sender_user_id, message_type::text AS message_type,
                body, metadata, created_at, edited_at, deleted_at
           FROM messaging.messages
          WHERE conversation_id = $1::uuid
            AND created_at > (SELECT created_at FROM messaging.messages WHERE id = $2::uuid)
          ORDER BY created_at ASC
          LIMIT $3`,
        [conversationId, options.after, limit],
      );
      return r.rows;
    }
    const before = options.before ?? null;
    const r = await this.db.query<MessagingMessageRow>(
      `SELECT id, conversation_id, sender_user_id, message_type::text AS message_type,
              body, metadata, created_at, edited_at, deleted_at
         FROM messaging.messages
        WHERE conversation_id = $1::uuid
          AND ($2::uuid IS NULL OR created_at < (SELECT created_at FROM messaging.messages WHERE id = $2::uuid))
        ORDER BY created_at DESC
        LIMIT $3`,
      [conversationId, before, limit],
    );
    return r.rows;
  }

  async getLatestMessage(conversationId: string, executor: QueryExecutor = this.db): Promise<MessagingMessageRow | null> {
    const r = await executor.query<MessagingMessageRow>(
      `SELECT id, conversation_id, sender_user_id, message_type::text AS message_type,
              body, metadata, created_at, edited_at, deleted_at
         FROM messaging.messages
        WHERE conversation_id = $1::uuid
        ORDER BY created_at DESC
        LIMIT 1`,
      [conversationId],
    );
    return r.rows[0] ?? null;
  }

  async editMessage(messageId: string, body: string, executor: QueryExecutor = this.db): Promise<MessagingMessageRow | null> {
    const r = await executor.query<MessagingMessageRow>(
      `UPDATE messaging.messages
          SET body = $2, edited_at = now()
        WHERE id = $1::uuid
        RETURNING id, conversation_id, sender_user_id, message_type::text AS message_type,
                  body, metadata, created_at, edited_at, deleted_at`,
      [messageId, body],
    );
    return r.rows[0] ?? null;
  }

  async softDeleteMessage(messageId: string, executor: QueryExecutor = this.db): Promise<MessagingMessageRow | null> {
    const r = await executor.query<MessagingMessageRow>(
      `UPDATE messaging.messages
          SET deleted_at = now()
        WHERE id = $1::uuid
        RETURNING id, conversation_id, sender_user_id, message_type::text AS message_type,
                  body, metadata, created_at, edited_at, deleted_at`,
      [messageId],
    );
    return r.rows[0] ?? null;
  }

  async countRecentBySender(senderUserId: string, windowSeconds: number, executor: QueryExecutor = this.db): Promise<number> {
    const r = await executor.query<{ count: string }>(
      `SELECT count(*) AS count
         FROM messaging.messages
        WHERE sender_user_id = $1::uuid
          AND created_at > now() - ($2 || ' seconds')::interval`,
      [senderUserId, String(windowSeconds)],
    );
    return Number(r.rows[0]?.count ?? '0');
  }

  // ------------------------------------------------------------------ read state / receipts

  async markRead(conversationId: string, userId: string, at: Date, executor: QueryExecutor = this.db): Promise<void> {
    await executor.query(
      `UPDATE messaging.conversation_members
          SET last_read_at = GREATEST(COALESCE(last_read_at, to_timestamp(0)), $3)
        WHERE conversation_id = $1::uuid AND user_id = $2::uuid`,
      [conversationId, userId, at],
    );
  }

  async unreadCountFor(conversationId: string, userId: string, executor: QueryExecutor = this.db): Promise<number> {
    const r = await executor.query<{ count: string }>(
      `SELECT count(*) AS count
         FROM messaging.messages m
         JOIN messaging.conversation_members cm
           ON cm.conversation_id = m.conversation_id AND cm.user_id = $2::uuid
        WHERE m.conversation_id = $1::uuid
          AND m.sender_user_id <> $2::uuid
          AND m.deleted_at IS NULL
          AND (cm.last_read_at IS NULL OR m.created_at > cm.last_read_at)`,
      [conversationId, userId],
    );
    return Number(r.rows[0]?.count ?? '0');
  }

  async recordReceipt(messageId: string, recipientUserId: string, executor: QueryExecutor = this.db): Promise<boolean> {
    const r = await executor.query<{ id: string }>(
      `INSERT INTO messaging.message_receipts (message_id, recipient_user_id)
       VALUES ($1::uuid, $2::uuid)
       ON CONFLICT (message_id, recipient_user_id) DO NOTHING
       RETURNING message_id AS id`,
      [messageId, recipientUserId],
    );
    return r.rows.length > 0;
  }

  async receiptsForMessages(messageIds: string[], executor: QueryExecutor = this.db): Promise<Array<{ message_id: string; recipient_user_id: string; delivered_at: Date }>> {
    if (messageIds.length === 0) return [];
    const r = await executor.query<{ message_id: string; recipient_user_id: string; delivered_at: Date }>(
      `SELECT message_id, recipient_user_id, delivered_at
         FROM messaging.message_receipts
        WHERE message_id = ANY($1::uuid[])`,
      [messageIds],
    );
    return r.rows;
  }
}
