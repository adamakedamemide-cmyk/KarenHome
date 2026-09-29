import { Controller, NotImplementedException, Post, Body } from '@nestjs/common';

@Controller('search')
export class SearchController {
  @Post('listings')
  search(@Body() _query: unknown): never {
    throw new NotImplementedException('Search index is not enabled in Gate 2');
  }
}
