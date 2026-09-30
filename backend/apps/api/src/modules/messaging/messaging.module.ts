import { Module } from '@nestjs/common';
import { MessagingService } from './application/messaging.service';
import { MessagingController } from './presentation/messaging.controller';

@Module({
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
