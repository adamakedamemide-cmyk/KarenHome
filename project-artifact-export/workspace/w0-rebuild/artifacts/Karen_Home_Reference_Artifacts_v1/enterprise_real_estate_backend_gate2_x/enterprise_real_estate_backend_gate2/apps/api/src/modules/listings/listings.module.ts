import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database.module';
import { ListingsController } from './presentation/listings.controller';
import { ListingService } from './application/listing.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ListingsController],
  providers: [ListingService],
})
export class ListingsModule {}
