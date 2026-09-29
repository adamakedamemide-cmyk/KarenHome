import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from '../application/search.service';
import { ListingSearchQueryDto } from './dto/search-query.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('listings')
  async search(@Query() query: ListingSearchQueryDto) {
    const result = await this.searchService.search({
      q: query.q,
      transactionType: query.transactionType,
      propertyType: query.propertyType,
      priceMin: query.priceMin,
      priceMax: query.priceMax,
      currencyCode: query.currencyCode,
      bbox: parseBbox(query.bbox),
      sort: query.sort ?? 'relevance',
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 24,
    });
    return {
      data: result.hits,
      meta: {
        total: result.total,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 24,
        facets: result.facets,
        engine: result.engine,
      },
    };
  }

  @Get('health')
  async health() {
    return { data: await this.searchService.health() };
  }
}

function parseBbox(raw?: string): { minLon: number; minLat: number; maxLon: number; maxLat: number } | undefined {
  if (!raw) return undefined;
  const parts = raw.split(',').map((value) => Number(value));
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) return undefined;
  const [minLon, minLat, maxLon, maxLat] = parts;
  if (minLon === undefined || minLat === undefined || maxLon === undefined || maxLat === undefined) return undefined;
  return { minLon, minLat, maxLon, maxLat };
}
