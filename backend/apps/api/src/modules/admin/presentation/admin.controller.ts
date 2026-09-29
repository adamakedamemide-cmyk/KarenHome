import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { AccessTokenGuard } from '../../../common/auth/access-token.guard';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { IamRepository, JobRepository, SearchIndexRepository } from '@platform/db';
import type { AuthenticatedUser } from '@platform/contracts';
import { SearchService } from '../../search/application/search.service';
import { AdvertisingService } from '../../advertising/application/advertising.service';

@Injectable()
export class PlatformAdminGuard {
  constructor(private readonly iam: IamRepository) {}

  async requirePlatformAdmin(actor: AuthenticatedUser): Promise<void> {
    const permissions = await this.iam.listPermissionCodesForUser(actor.id);
    if (!permissions.includes('platform.admin')) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Platform admin permission is required' });
    }
  }
}

@Controller('admin')
@UseGuards(AccessTokenGuard)
export class AdminController {
  constructor(
    private readonly adminGuard: PlatformAdminGuard,
    private readonly jobs: JobRepository,
    private readonly search: SearchService,
    private readonly ads: AdvertisingService,
    private readonly indexState: SearchIndexRepository,
  ) {}

  /** §11 — RebuildSearchIndex command (job-driven, chunked in the worker). */
  @Post('search/rebuild')
  async rebuildSearchIndex(@CurrentUser() user: AuthenticatedUser) {
    await this.adminGuard.requirePlatformAdmin(user);
    return { data: await this.search.requestRebuild(user.id) };
  }

  @Get('search/index-state')
  async getSearchIndexState(@CurrentUser() user: AuthenticatedUser) {
    await this.adminGuard.requirePlatformAdmin(user);
    return { data: await this.indexState.stats() };
  }

  @Get('jobs/stats')
  async jobStats(@CurrentUser() user: AuthenticatedUser) {
    await this.adminGuard.requirePlatformAdmin(user);
    return { data: await this.jobs.stats() };
  }

  @Post('jobs/:id/requeue-dead')
  async requeueDeadJob(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.adminGuard.requirePlatformAdmin(user);
    await this.jobs.requeueDead(id);
    return { data: { requeued: true } };
  }

  /** Advertising daily rollup for one campaign/date — full sweep is the worker's job. */
  @Post('ads/rollup')
  async adsRollup(@CurrentUser() user: AuthenticatedUser, @Body() body: { date?: string; campaignId: string }) {
    await this.adminGuard.requirePlatformAdmin(user);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(body?.date ?? '') ? body.date : new Date().toISOString().slice(0, 10);
    await this.ads.rollupDaily(body.campaignId, date as string);
    return { data: { campaignId: body.campaignId, date } };
  }
}
