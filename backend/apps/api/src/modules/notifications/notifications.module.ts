import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database.module';
import { NotificationsController } from './presentation/notifications.controller';
import { NotificationService } from './application/notification.service';

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationsController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
