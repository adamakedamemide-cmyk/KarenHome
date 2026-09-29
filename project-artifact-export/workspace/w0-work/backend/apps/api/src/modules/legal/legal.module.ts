import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Injectable, Module } from '@nestjs/common';
import { IsNumber, Min } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { PostgresDatabase } from '@platform/db';
import { AccessTokenGuard } from '../../common/auth/access-token.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '@platform/contracts';
import { DatabaseModule } from '../../infrastructure/database.module';

export class AcceptAgreementDto {
  @IsNumber() @Min(1) version!: number;
}

@Injectable()
export class LegalAgreementsService {
  constructor(private readonly db: PostgresDatabase) {}

  async accept(input: { userId: string; code: string; version: number; ip?: string | undefined; requestId?: string | undefined }): Promise<{ accepted: true }> {
    await this.db.query(
      `INSERT INTO legal.user_agreement_acceptances(user_id, agreement_code, agreement_version, ip, request_id)
       VALUES ($1::uuid, $2, $3, $4::inet, $5::uuid)
       ON CONFLICT (user_id, agreement_code, agreement_version) DO NOTHING`,
      [input.userId, input.code, input.version, input.ip ?? null, input.requestId ?? null],
    );
    return { accepted: true };
  }

  async hasAccepted(userId: string, code: string, version: number): Promise<boolean> {
    const r = await this.db.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM legal.user_agreement_acceptances WHERE user_id = $1::uuid AND agreement_code = $2 AND agreement_version >= $3) AS exists`,
      [userId, code, version],
    );
    return r.rows[0]?.exists ?? false;
  }
}

@Controller('legal/agreements')
@UseGuards(AccessTokenGuard)
export class LegalAgreementsController {
  constructor(private readonly service: LegalAgreementsService) {}

  @Post(':code/accept')
  async accept(
    @Param('code') code: string,
    @Body() dto: AcceptAgreementDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: FastifyRequest,
  ) {
    const data = await this.service.accept({
      userId: user.id,
      code,
      version: dto.version,
      ip: request.ip,
      requestId: String(request.id ?? ''),
    });
    return { data };
  }
}

@Module({
  imports: [DatabaseModule],
  controllers: [LegalAgreementsController],
  providers: [LegalAgreementsService],
  exports: [LegalAgreementsService],
})
export class LegalModule {}
