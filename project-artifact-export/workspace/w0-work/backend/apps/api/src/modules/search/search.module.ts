import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database.module';
import { SearchService } from './application/search.service';
import { SearchController } from './presentation/search.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
