import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database.module';
import { SearchModule } from '../search/search.module';
import { AdvertisingModule } from '../advertising/advertising.module';
import { AdminController, PlatformAdminGuard } from './presentation/admin.controller';

@Module({
  imports: [DatabaseModule, SearchModule, AdvertisingModule],
  controllers: [AdminController],
  providers: [PlatformAdminGuard],
})
export class AdminModule {}
