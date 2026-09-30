import { randomUUID } from 'node:crypto';
import {
  IamRepository, MessagingRepository, OutboxRepository, PostgresDatabase,
} from '@platform/db';
import {
  MessagingService,
  MESSAGE_RATE_LIMIT_COUNT,
} from '../../src/modules/messaging/application/messaging.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '@platform/contracts';

const enabled = Boolean(process.env.RUN_DB_TESTS && process.env.DATABASE_URL);
const d = enabled ? describe : describe.skip;

d('G5.1 Messaging — integration against real PostgreSQL (Gate 5.1 Phase B)', () => {
  let db: PostgresDatabase;
  let iam: IamRepository;
  let messagingRepo: MessagingRepository;
  let outbox: OutboxRepository;
  let service: MessagingService;

  const createdUserIds: string[] = [];
  const grantedUserIds: string[] = [];

  beforeAll(async () => {
    db = new PostgresDatabase({ connectionString: process.env.DATABASE_URL!, max: 5 });
    iam = new IamRepository(db);
    messagingRepo = new MessagingRepository(db);
    outbox = new OutboxRepository(db);
    service = new MessagingService(messagingRepo, outbox, iam);
  });

  afterAll(async () => {
    await db.close();
  });

  async function grantMessagingPermissions(userId: string, codes: string[]): Promise<void> {
    await db.query(
      `INSERT INTO iam.user_permission_grants (user_id, permission_id, source)
       SELECT $1::uuid, p.id, 'DIRECT' FROM iam.permissions p WHERE p.code = ANY($2::text[])
       ON CONFLICT DO NOTHING`,
      [userId, codes],
    );
    if (!grantedUserIds.includes(userId)) grantedUserIds.push(userId);
  }

  async function newUser(email: string): Promise<AuthenticatedUser> {
    const user = await iam.createPasswordUser({ email, passwordHash: 'test-hash' });
    createdUserIds.push(user.id);
    await grantMessagingPermissions(user.id, ['messaging.view', 'messaging.manage']);
    return { id: user.id, status: 'active' } as AuthenticatedUser;
  }

  async function noPermissionUser(email: string): Promise<AuthenticatedUser> {
    const user = await iam.createPasswordUser({ email, passwordHash: 'test-hash' });
    createdUserIds.push(user.id);
    return { id: user.id, status: 'active' } as AuthenticatedUser;
  }

  async function eventCount(eventType: string, aggregateId: string): Promise<number> {
    const r = await db.query<{ count: string }>(
      `SELECT count(*) AS count FROM audit.outbox_events WHERE event_type = $1 AND aggregate_id = $2::uuid`,
      [eventType, aggregateId],
    );
    return Number(r.rows[0]?.count ?? '0');
  }

  it('I1 — creates a support conversation with ≥2 members and emits MessagingConversationStarted.v1', async () => {
    const a = await newUser(`g51msg-${randomUUID()}@t.local`);
    const b = await newUser(`g51msg-${randomUUID()}@t.local`);
    const result = (await service.createConversation({ type: 'support', memberUserIds: [a.id, b.id] }, a)) as { id: string };
    expect(result.id).toBeTruthy();
    const conversation = await messagingRepo.getConversation(result.id);
    expect(conversation?.type).toBe('support');
    expect(await eventCount('MessagingConversationStarted.v1', result.id)).toBe(1);
  });

  it('I2 — listing_inquiry without listingId is rejected; conversation type integrity trigger is DB-enforced', async () => {
    const a = await newUser(`g51msg-${randomUUID()}@t.local`);
    await expect(service.createConversation({ type: 'listing_inquiry', memberUserIds: [a.id] }, a))
      .rejects.toMatchObject({ response: { code: 'CONVERSATION_LISTING_REQUIRED' } });
    // DB-level defense: direct insert also fails
    await expect(db.query(`INSERT INTO messaging.conversations (type) VALUES ('listing_inquiry')`))
      .rejects.toThrow(/CONVERSATION_LISTING_REQUIRED/);
  });

  it('I3 — full message lifecycle: send → list → unread counts → markRead → unread 0', async () => {
    const a = await newUser(`g51msg-${randomUUID()}@t.local`);
    const b = await newUser(`g51msg-${randomUUID()}@t.local`);
    const conv = (await service.createConversation({ type: 'support', memberUserIds: [a.id, b.id] }, a)) as { id: string };
    const m1 = (await service.sendMessage({ conversationId: conv.id, body: 'hello from A' }, a)) as { id: string };
    await service.sendMessage({ conversationId: conv.id, body: 'hello from B' }, b);

    const forB = (await service.getConversation(conv.id, b)) as { unreadCount: number };
    expect(forB.unreadCount).toBe(1); // unread excludes B's own messages
    await service.markRead(conv.id, b);
    const forBAfter = (await service.getConversation(conv.id, b)) as { unreadCount: number };
    expect(forBAfter.unreadCount).toBe(0);

    const history = (await service.listMessages(conv.id, a)) as Array<{ id: string; body: string; deleted: boolean }>;
    expect(history.length).toBe(2);
    expect(history.map((m) => m.id)).toContain(m1.id);
    expect(await eventCount('MessageSent.v1', m1.id)).toBe(1);
    expect(await eventCount('ConversationRead.v1', conv.id)).toBeGreaterThanOrEqual(1);
  });

  it('I4 — IDOR: non-member read/write attempts return 404 and leave no trace', async () => {
    const a = await newUser(`g51msg-${randomUUID()}@t.local`);
    // outsider holds the API-surface permission (messaging.view) but is NOT a
    // member — the IDOR property is that member-scope is still enforced (404)
    const outsider = await newUser(`g51msg-${randomUUID()}@t.local`);
    const b = await newUser(`g51msg-${randomUUID()}@t.local`);
    const conv = (await service.createConversation({ type: 'support', memberUserIds: [a.id, b.id] }, a)) as { id: string };
    await expect(service.sendMessage({ conversationId: conv.id, body: 'intruding' }, outsider))
      .rejects.toBeInstanceOf(NotFoundException);
    await expect(service.listMessages(conv.id, outsider)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getConversation(conv.id, outsider)).rejects.toBeInstanceOf(NotFoundException);
    expect(await eventCount('MessageSent.v1', conv.id)).toBe(0);
  });

  it('I5 — IDOR on message paths: cross-conversation message id is rejected', async () => {
    const a = await newUser(`g51msg-${randomUUID()}@t.local`);
    const b = await newUser(`g51msg-${randomUUID()}@t.local`);
    const c = await newUser(`g51msg-${randomUUID()}@t.local`);
    const convA = (await service.createConversation({ type: 'support', memberUserIds: [a.id, c.id] }, a)) as { id: string };
    const convB = (await service.createConversation({ type: 'support', memberUserIds: [b.id, c.id] }, b)) as { id: string };
    const msgB = (await service.sendMessage({ conversationId: convB.id, body: 'B secret' }, b)) as { id: string };
    // A is not a member of convB — deleting/reading B's message through convA path fails
    await expect(service.deleteMessage(convA.id, msgB.id, a)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.editMessage(convA.id, msgB.id, 'hacked', a)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('I6 — edit policy: sender edit within window succeeds; DB trigger blocks conversation reassignment', async () => {
    const a = await newUser(`g51msg-${randomUUID()}@t.local`);
    const b = await newUser(`g51msg-${randomUUID()}@t.local`);
    const conv = (await service.createConversation({ type: 'support', memberUserIds: [a.id, b.id] }, a)) as { id: string };
    const m = (await service.sendMessage({ conversationId: conv.id, body: 'original' }, a)) as { id: string };
    const edited = (await service.editMessage(conv.id, m.id, 'corrected', a)) as { editedAt: string };
    expect(edited.editedAt).toBeTruthy();
    // direct DB manipulation must fail (defense in depth)
    await expect(db.query(`UPDATE messaging.messages SET conversation_id = gen_random_uuid() WHERE id = $1::uuid`, [m.id]))
      .rejects.toThrow(/MESSAGE_EDIT_FORBIDDEN/);
  });

  it('I7 — edit policy: second edit is rejected (single edit per message)', async () => {
    const a = await newUser(`g51msg-${randomUUID()}@t.local`);
    const b = await newUser(`g51msg-${randomUUID()}@t.local`);
    const conv = (await service.createConversation({ type: 'support', memberUserIds: [a.id, b.id] }, a)) as { id: string };
    const m = (await service.sendMessage({ conversationId: conv.id, body: 'one' }, a)) as { id: string };
    await service.editMessage(conv.id, m.id, 'two', a);
    await expect(service.editMessage(conv.id, m.id, 'three', a))
      .rejects.toMatchObject({ response: { code: 'MESSAGE_EDIT_WINDOW_EXPIRED' } });
  });

  it('I8 — delete policy: soft delete retains body for moderation; second delete blocked at DB level', async () => {
    const a = await newUser(`g51msg-${randomUUID()}@t.local`);
    const b = await newUser(`g51msg-${randomUUID()}@t.local`);
    const conv = (await service.createConversation({ type: 'support', memberUserIds: [a.id, b.id] }, a)) as { id: string };
    const m = (await service.sendMessage({ conversationId: conv.id, body: 'to be deleted' }, a)) as { id: string };
    const deleted = (await service.deleteMessage(conv.id, m.id, a)) as { deletedAt: string };
    expect(deleted.deletedAt).toBeTruthy();
    const raw = await db.query<{ body: string | null; deleted_at: Date }>(`SELECT body, deleted_at FROM messaging.messages WHERE id = $1::uuid`, [m.id]);
    expect(raw.rows[0]!.deleted_at).toBeTruthy();
    // body RETAINED server-side for moderation (base-schema CHECK forbids
    // nulling text bodies); the API layer masks it (I8 masked assertion below)
    expect(raw.rows[0]!.body).toBe('to be deleted');
    // already-deleted messages are immutable (DB trigger)
    await expect(db.query(`UPDATE messaging.messages SET deleted_at = now() WHERE id = $1::uuid`, [m.id]))
      .rejects.toThrow(/MESSAGE_IMMUTABLE_DELETED|MESSAGE_ALREADY_DELETED/);
    const masked = (await service.listMessages(conv.id, a)) as Array<{ id: string; body: string | null; deleted: boolean }>;
    expect(masked.find((x) => x.id === m.id)).toMatchObject({ deleted: true, body: null });
  });

  it('I9 — rate limit: sender blocked after MESSAGE_RATE_LIMIT_COUNT messages in the window', async () => {
    const a = await newUser(`g51msg-${randomUUID()}@t.local`);
    const helper = await newUser(`g51msg-${randomUUID()}@t.local`);
    const conv = (await service.createConversation({ type: 'support', memberUserIds: [a.id, helper.id] }, a)) as { id: string };
    for (let i = 0; i < MESSAGE_RATE_LIMIT_COUNT; i++) {
      await service.sendMessage({ conversationId: conv.id, body: `msg ${i}` }, a);
    }
    await expect(service.sendMessage({ conversationId: conv.id, body: 'one too many' }, a))
      .rejects.toMatchObject({ response: { code: 'MESSAGE_RATE_LIMITED' } });
    // other senders are unaffected (per-sender window)
    await expect(service.sendMessage({ conversationId: conv.id, body: 'b fine' }, helper)).resolves.toBeDefined();
  });

  it('I10 — delivery receipts are idempotent per (message, recipient) and emit MessageDelivered.v1 once', async () => {
    const a = await newUser(`g51msg-${randomUUID()}@t.local`);
    const b = await newUser(`g51msg-${randomUUID()}@t.local`);
    const conv = (await service.createConversation({ type: 'support', memberUserIds: [a.id, b.id] }, a)) as { id: string };
    const m = (await service.sendMessage({ conversationId: conv.id, body: 'ack me' }, a)) as { id: string };
    const first = (await service.recordDeliveryReceipt(conv.id, m.id, b)) as { recorded: boolean };
    const second = (await service.recordDeliveryReceipt(conv.id, m.id, b)) as { recorded: boolean };
    expect(first.recorded).toBe(true);
    expect(second.recorded).toBe(false);
    expect(await eventCount('MessageDelivered.v1', m.id)).toBe(1);
  });

  it('I11 — stream cursor + poll: no history dump; only messages after the cursor are returned', async () => {
    const a = await newUser(`g51msg-${randomUUID()}@t.local`);
    const b = await newUser(`g51msg-${randomUUID()}@t.local`);
    const conv = (await service.createConversation({ type: 'support', memberUserIds: [a.id, b.id] }, a)) as { id: string };
    await service.sendMessage({ conversationId: conv.id, body: 'before-connect' }, a);
    const cursor = await service.streamCursor(conv.id, b);
    expect(cursor).toBeTruthy();
    const m2 = (await service.sendMessage({ conversationId: conv.id, body: 'after-connect' }, a)) as { id: string };
    const polled = (await service.streamPoll(conv.id, b, cursor)) as Array<{ id: string; body: string }>;
    expect(polled.map((x) => x.id)).toEqual([m2.id]);
  });

  it('I12 — permission surface: user without messaging.view cannot use any messaging path', async () => {
    const plain = await noPermissionUser(`g51msg-${randomUUID()}@t.local`);
    await expect(service.listConversations(plain)).rejects.toBeInstanceOf(ForbiddenException);
    const a = await newUser(`g51msg-${randomUUID()}@t.local`);
    const b2 = await newUser(`g51msg-${randomUUID()}@t.local`);
    const conv = (await service.createConversation({ type: 'support', memberUserIds: [a.id, b2.id] }, a)) as { id: string };
    // even a MEMBER without the permission is blocked from the API surface
    await db.query(`INSERT INTO messaging.conversation_members (conversation_id, user_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING`, [conv.id, plain.id]);
    await expect(service.sendMessage({ conversationId: conv.id, body: 'no perms' }, plain)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
