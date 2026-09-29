import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database.module';
import { MediaController } from './presentation/media.controller';
import { MediaService } from './application/media.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
