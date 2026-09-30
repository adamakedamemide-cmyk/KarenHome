import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { MessagingService, MESSAGE_RATE_LIMIT_COUNT } from '../src/modules/messaging/application/messaging.service';
import type { AuthenticatedUser } from '@platform/contracts';

type LooseMock = jest.Mock & any;

function mockFn(impl?: (...args: any[]) => any): LooseMock {
  return (impl ? jest.fn(impl) : jest.fn()) as LooseMock;
}

// NOTE: mocks return the UNWRAPPED repository-method results (a repository
// method already maps DB rows → domain objects), not the raw DB result shape.
function makeRepo(overrides: Record<string, LooseMock> = {}) {
  const now = new Date();
  const repo: Record<string, LooseMock> = {
    getMembership: mockFn(async () => ({ conversation_id: 'c1', user_id: 'u1', joined_at: now, last_read_at: null })),
    getConversation: mockFn(async () => ({ id: 'c1', type: 'support', listing_id: null, organization_id: null, created_at: now })),
    createConversation: mockFn(async () => ({ id: 'c-new', type: 'support', listing_id: null, organization_id: null, created_at: now })),
    listMembers: mockFn(async () => []),
    unreadCountFor: mockFn(async () => 3),
    listConversationsForUser: mockFn(async () => []),
    appendMessage: mockFn(async () => ({ id: 'm1', conversation_id: 'c1', sender_user_id: 'u1', message_type: 'text', body: 'hi', metadata: {}, created_at: now, edited_at: null, deleted_at: null })),
    getMessage: mockFn(async () => ({ id: 'm1', conversation_id: 'c1', sender_user_id: 'u1', message_type: 'text', body: 'hi', metadata: {}, created_at: new Date(Date.now() - 1000), edited_at: null, deleted_at: null })),
    listMessages: mockFn(async () => []),
    editMessage: mockFn(async () => ({ id: 'm1', conversation_id: 'c1', sender_user_id: 'u1', message_type: 'text', body: 'edited', metadata: {}, created_at: now, edited_at: now, deleted_at: null })),
    softDeleteMessage: mockFn(async () => ({ id: 'm1', conversation_id: 'c1', sender_user_id: 'u1', message_type: 'text', body: null, metadata: {}, created_at: now, edited_at: null, deleted_at: now })),
    countRecentBySender: mockFn(async () => 0),
    markRead: mockFn(async () => undefined),
    recordReceipt: mockFn(async () => true),
    getLatestMessage: mockFn(async () => null),
    addMember: mockFn(async () => undefined),
  };
  return Object.assign(repo, overrides);
}

function makeService(repo = makeRepo()) {
  const outbox = { append: mockFn(async () => 'evt-1') };
  const iam = {
    listPermissionCodesForUser: mockFn(async () => ['messaging.view', 'messaging.manage']),
  };
  const service = new MessagingService(repo as never, outbox as never, iam as never);
  return { service, repo, outbox, iam };
}

const actor: AuthenticatedUser = { id: 'u1', status: 'active' } as AuthenticatedUser;

describe('G5.1 Messaging service (unit, mocked repositories)', () => {
  beforeEach(async () => { jest.clearAllMocks(); });

  it('U1 — createConversation: listing_inquiry without listingId is rejected (422)', async () => {
    const { service } = makeService();
    await expect(service.createConversation({ type: 'listing_inquiry', memberUserIds: ['u1', 'u2'] }, actor))
      .rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('U2 — createConversation: creator auto-added as member', async () => {
    const { service, repo } = makeService();
    await expect(service.createConversation({ type: 'support', memberUserIds: ['u2'] }, actor)).resolves.toBeDefined();
    const inserted = repo.createConversation.mock.calls[0]![0] as { memberUserIds: string[] };
    expect(inserted.memberUserIds).toEqual(expect.arrayContaining(['u1', 'u2']));
  });

  it('U3 — createConversation: single member without creator is rejected', async () => {
    const { service } = makeService();
    await expect(service.createConversation({ type: 'support', memberUserIds: [] }, actor))
      .rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('U4 — sendMessage: non-member gets 404 without existence leak', async () => {
    const repo = makeRepo({ getMembership: mockFn(async () => null) });
    const { service } = makeService(repo);
    await expect(service.sendMessage({ conversationId: 'c1', body: 'hello' }, actor))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('U5 — sendMessage: text without body is rejected (422)', async () => {
    const { service } = makeService();
    await expect(service.sendMessage({ conversationId: 'c1', messageType: 'text' }, actor))
      .rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('U6 — sendMessage: system message requires messaging.manage (ForbiddenException)', async () => {
    const { service, iam } = makeService();
    iam.listPermissionCodesForUser.mockResolvedValue(['messaging.view']);
    await expect(service.sendMessage({ conversationId: 'c1', messageType: 'system', body: 'notice' }, actor))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('U7 — sendMessage: rate limit triggers MESSAGE_RATE_LIMITED at threshold', async () => {
    const repo = makeRepo({ countRecentBySender: mockFn(async () => MESSAGE_RATE_LIMIT_COUNT) });
    const { service } = makeService(repo);
    await expect(service.sendMessage({ conversationId: 'c1', body: 'hello' }, actor))
      .rejects.toMatchObject({ response: { code: 'MESSAGE_RATE_LIMITED' } });
  });

  it('U8 — editMessage: non-sender (even member) is forbidden', async () => {
    const repo = makeRepo({
      getMessage: mockFn(async () => ({ id: 'm1', conversation_id: 'c1', sender_user_id: 'u-other', message_type: 'text', body: 'x', metadata: {}, created_at: new Date(), edited_at: null, deleted_at: null })),
    });
    const { service } = makeService(repo);
    await expect(service.editMessage('c1', 'm1', 'new body', actor))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('U9 — editMessage: already-edited message is rejected (single edit policy)', async () => {
    const repo = makeRepo({
      getMessage: mockFn(async () => ({ id: 'm1', conversation_id: 'c1', sender_user_id: 'u1', message_type: 'text', body: 'x', metadata: {}, created_at: new Date(), edited_at: new Date(), deleted_at: null })),
    });
    const { service } = makeService(repo);
    await expect(service.editMessage('c1', 'm1', 'new body', actor))
      .rejects.toMatchObject({ response: { code: 'MESSAGE_EDIT_WINDOW_EXPIRED' } });
  });

  it('U10 — deleteMessage by a moderator (non-sender) requires messaging.manage and emits event', async () => {
    const repo = makeRepo({
      getMessage: mockFn(async () => ({ id: 'm1', conversation_id: 'c1', sender_user_id: 'u-other', message_type: 'text', body: 'x', metadata: {}, created_at: new Date(), edited_at: null, deleted_at: null })),
    });
    const { service, outbox } = makeService(repo);
    await expect(service.deleteMessage('c1', 'm1', actor)).resolves.toBeDefined();
    expect(outbox.append.mock.calls.some((c: any[]) => (c[0] as { eventType: string }).eventType === 'MessageDeleted.v1')).toBe(true);
  });

  it('U11 — deleteMessage: non-sender WITHOUT messaging.manage is forbidden', async () => {
    const repo = makeRepo({
      getMessage: mockFn(async () => ({ id: 'm1', conversation_id: 'c1', sender_user_id: 'u-other', message_type: 'text', body: 'x', metadata: {}, created_at: new Date(), edited_at: null, deleted_at: null })),
    });
    const { service, iam } = makeService(repo);
    iam.listPermissionCodesForUser.mockResolvedValue(['messaging.view']);
    await expect(service.deleteMessage('c1', 'm1', actor))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('U12 — listMessages masks soft-deleted bodies but keeps metadata', async () => {
    const repo = makeRepo({
      listMessages: mockFn(async () => [
        { id: 'm1', conversation_id: 'c1', sender_user_id: 'u1', message_type: 'text', body: 'secret', metadata: { k: 1 }, created_at: new Date(), edited_at: null, deleted_at: new Date() },
        { id: 'm2', conversation_id: 'c1', sender_user_id: 'u1', message_type: 'text', body: 'hello', metadata: {}, created_at: new Date(), edited_at: null, deleted_at: null },
      ]),
    });
    const { service } = makeService(repo);
    const result = await service.listMessages('c1', actor) as Array<Record<string, unknown>>;
    expect(result[0]).toMatchObject({ deleted: true, body: null, metadata: { k: 1 } });
    expect(result[1]).toMatchObject({ deleted: false, body: 'hello' });
  });

  it('U13 — every message send/read/delete emits a versioned outbox event', async () => {
    const { service, outbox } = makeService();
    await service.sendMessage({ conversationId: 'c1', body: 'hello' }, actor);
    await service.markRead('c1', actor);
    await service.deleteMessage('c1', 'm1', actor);
    const types = outbox.append.mock.calls.map((c: any[]) => (c[0] as { eventType: string }).eventType);
    expect(types).toEqual(expect.arrayContaining(['MessageSent.v1', 'ConversationRead.v1', 'MessageDeleted.v1']));
    for (const call of outbox.append.mock.calls) {
      expect((call[0] as { eventVersion: number }).eventVersion).toBe(1);
    }
  });
});
