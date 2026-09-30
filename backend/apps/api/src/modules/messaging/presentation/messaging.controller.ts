import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { FastifyReply } from 'fastify';
import { AccessTokenGuard } from '../../../common/auth/access-token.guard';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '@platform/contracts';
import {
  MessagingService,
  MESSAGE_RATE_LIMIT_COUNT,
  MESSAGE_RATE_LIMIT_WINDOW_SECONDS,
} from '../application/messaging.service';

export class CreateConversationDto {
  @IsIn(['listing_inquiry', 'lead', 'support', 'system']) type!: 'listing_inquiry' | 'lead' | 'support' | 'system';
  @IsOptional() @IsUUID() listingId?: string;
  @IsOptional() @IsUUID() organizationId?: string;
  @IsUUID(4, { each: true }) memberUserIds!: string[];
}

export class SendMessageDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(8000) body?: string;
  @IsOptional() @IsIn(['text', 'image', 'file']) messageType?: 'text' | 'image' | 'file';
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class EditMessageDto {
  @IsString() @MinLength(1) @MaxLength(8000) body!: string;
}

export class MarkReadDto {
  @IsOptional() @IsString() at?: string; // ISO timestamp
}

export class ListMessagesQuery {
  @IsOptional() @IsInt() @Min(1) @Max(200) limit?: number | undefined;
  @IsOptional() @IsUUID() before?: string | undefined;
}

export class ListConversationsQuery {
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number | undefined;
}

@Controller('messaging')
@UseGuards(AccessTokenGuard)
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Post('conversations')
  async createConversation(@Body() dto: CreateConversationDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.messaging.createConversation(dto, user) };
  }

  @Get('conversations')
  async listConversations(@Query() query: ListConversationsQuery, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.messaging.listConversations(user, query.limit) };
  }

  @Get('conversations/:id')
  async getConversation(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.messaging.getConversation(id, user) };
  }

  @Post('conversations/:id/members')
  async addMember(@Param('id') id: string, @Body() dto: { memberUserId: string }, @CurrentUser() user: AuthenticatedUser) {
    await this.messaging.addMember(id, dto.memberUserId, user);
    return { data: { added: true } };
  }

  @Get('conversations/:id/messages')
  async listMessages(@Param('id') id: string, @Query() query: ListMessagesQuery, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.messaging.listMessages(id, user, { limit: query.limit, before: query.before ?? undefined }) };
  }

  @Post('conversations/:id/messages')
  async sendMessage(@Param('id') id: string, @Body() dto: SendMessageDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.messaging.sendMessage({ conversationId: id, body: dto.body, messageType: dto.messageType, metadata: dto.metadata }, user) };
  }

  @Patch('conversations/:id/messages/:messageId')
  async editMessage(@Param('id') id: string, @Param('messageId') messageId: string, @Body() dto: EditMessageDto, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.messaging.editMessage(id, messageId, dto.body, user) };
  }

  @Delete('conversations/:id/messages/:messageId')
  async deleteMessage(@Param('id') id: string, @Param('messageId') messageId: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.messaging.deleteMessage(id, messageId, user) };
  }

  @Post('conversations/:id/read')
  async markRead(@Param('id') id: string, @Body() dto: MarkReadDto, @CurrentUser() user: AuthenticatedUser) {
    const at = dto.at ? new Date(dto.at) : undefined;
    return { data: await this.messaging.markRead(id, user, at) };
  }

  @Post('conversations/:id/messages/:messageId/receipts')
  async recordReceipt(@Param('id') id: string, @Param('messageId') messageId: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.messaging.recordDeliveryReceipt(id, messageId, user) };
  }

  /**
   * Realtime message stream (SSE).
   * - Connection authorization: access-token guard + membership check (same
   *   404 semantics as every read path — no existence leak).
   * - Reconnect semantics: `Last-Event-ID` header / `after` query carries the
   *   cursor; missed messages are replayed from the persisted log (id ORDER BY
   *   created_at ASC after the cursor), then the stream polls for new messages
   *   (DB-backed fan-out; no in-memory state — safe behind replicas/LBs).
   * - Delivery state: clients ACK via POST receipts; receipt is idempotent.
   * - On first connect (no cursor) only NEW messages are streamed; history is
   *   fetched via GET /messages.
   */
  @Get('conversations/:id/stream')
  async stream(
    @Param('id') id: string,
    @Query('after') afterQuery: string | undefined,
    @Res() reply: FastifyReply,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.messaging.requireMember(id, user.id);
    const lastEventId = afterQuery ?? (reply.request.headers['last-event-id'] as string | undefined);
    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    reply.raw.write(`retry: 3000\n\n`);
    const send = (event: string, data: unknown, eventId: string) => {
      reply.raw.write(`id: ${eventId}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    let cursor: string | undefined = lastEventId;
    if (!cursor) cursor = await this.messaging.streamCursor(id, user);
    let closed = false;
    reply.raw.on('close', () => { closed = true; });
    const pollIntervalMs = 1000;
    const maxStreamMs = 120_000; // server-side recycle; client reconnects (replay-safe)
    const startedAt = Date.now();
    while (!closed && Date.now() - startedAt < maxStreamMs) {
      const messages = await this.messaging.streamPoll(id, user, cursor);
      for (const m of messages) {
        // chronological (ASC) — cursor is the last emitted id
        send('message', m, String(m.id));
        cursor = String(m.id);
      }
      if (messages.length === 0) {
        // heartbeat keeps proxies from closing the connection
        reply.raw.write(`: ping ${Date.now()}\n\n`);
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    if (!closed) reply.raw.end();
  }
}

export const MESSAGING_RATE_LIMIT = { count: MESSAGE_RATE_LIMIT_COUNT, windowSeconds: MESSAGE_RATE_LIMIT_WINDOW_SECONDS };
