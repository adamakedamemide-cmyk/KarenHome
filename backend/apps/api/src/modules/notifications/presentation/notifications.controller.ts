import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { AccessTokenGuard } from '../../../common/auth/access-token.guard';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '@platform/contracts';
import { NotificationRepository, type NotificationChannel } from '@platform/db';
import { NotificationService } from '../application/notification.service';

export class PreferenceDto {
  @IsString() @MinLength(2) @MaxLength(64) notificationType!: string;
  @IsIn(['in_app', 'email', 'sms', 'push']) channel!: NotificationChannel;
  @IsBoolean() enabled!: boolean;
}

export class QuietHoursDto {
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) startTime!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) endTime!: string;
  @IsString() @MinLength(2) @MaxLength(64) timezone!: string;
}

@Controller('notifications')
@UseGuards(AccessTokenGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly service: NotificationService,
  ) {}

  @Get()
  async listUnread(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    const bounded = Math.min(100, Math.max(1, Number(limit ?? '25') || 25));
    return { data: await this.notifications.listUnread(user.id, bounded) };
  }

  @Post(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.notifications.markRead(id, user.id);
    return { data: { read: true } };
  }

  @Post('preferences')
  async setPreference(@CurrentUser() user: AuthenticatedUser, @Body() dto: PreferenceDto) {
    await this.notifications.setUserPreference(user.id, dto.notificationType, dto.channel, dto.enabled);
    return { data: { updated: true } };
  }

  @Post('quiet-hours')
  async setQuietHours(@CurrentUser() user: AuthenticatedUser, @Body() dto: QuietHoursDto) {
    await this.notifications.setQuietHours({ userId: user.id, startTime: dto.startTime, endTime: dto.endTime, timezone: dto.timezone });
    return { data: { updated: true } };
  }

  @Get('quiet-hours')
  async getQuietHours(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.notifications.getQuietHours(user.id) };
  }
}
