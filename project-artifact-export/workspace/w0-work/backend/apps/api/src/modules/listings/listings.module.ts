import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database.module';
import { SearchModule } from '../search/search.module';
import { ListingsController } from './presentation/listings.controller';
import { ListingService } from './application/listing.service';
import { ListingSearchService } from './application/listing-search.service';

@Module({
  imports: [DatabaseModule, SearchModule],
  controllers: [ListingsController],
  providers: [ListingService, ListingSearchService],
})
export class ListingsModule {}
