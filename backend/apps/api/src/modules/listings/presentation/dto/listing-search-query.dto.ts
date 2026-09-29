import { IsIn, IsNumber, IsNumberString, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class ListingSearchQueryDto {
  @IsOptional() @IsString() @MaxLength(200) q?: string;
  @IsOptional() @IsIn(['sale', 'rent', 'daily_rent', 'lease', 'pledge']) transactionType?: string;
  @IsOptional() @IsString() @MaxLength(64) propertyType?: string;
  @IsOptional() @IsNumberString() priceMin?: string;
  @IsOptional() @IsNumberString() priceMax?: string;
  @IsOptional() @IsString() @Matches(/^[A-Z]{3}$/) currencyCode?: string;
  /** "minLon,minLat,maxLon,maxLat" for map bounding box queries. */
  @IsOptional() @IsString() @MaxLength(120) bbox?: string;
  @IsOptional() @IsIn(['relevance', 'price_asc', 'price_desc', 'newest']) sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  @IsOptional() @IsNumber() @Min(1) page?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(100) pageSize?: number;
}
