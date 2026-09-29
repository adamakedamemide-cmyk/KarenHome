import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database.module';
import { AdsController, AdvertisingAdminController } from './presentation/ads.controller';
import { AdvertisingService } from './application/advertising.service';
import { AdvertisingAdminService } from './application/advertising-admin.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AdsController, AdvertisingAdminController],
  providers: [AdvertisingService, AdvertisingAdminService],
  exports: [AdvertisingService],
})
export class AdvertisingModule {}
