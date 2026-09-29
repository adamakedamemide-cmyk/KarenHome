import { IsIn, IsNumberString, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateListingDto {
  @IsUUID() propertyId!: string;
  @IsOptional() @IsUUID() managingOrganizationId?: string;
  @IsIn(['sale', 'rent', 'daily_rent', 'lease', 'pledge']) transactionType!: 'sale' | 'rent' | 'daily_rent' | 'lease' | 'pledge';
  @IsString() @MinLength(5) @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @Matches(/^[A-Z]{3}$/) currencyCode!: string;
  @IsNumberString() @Matches(/^\d+(\.\d{1,4})?$/) price!: string;
  @IsIn(['one_time', 'monthly', 'weekly', 'daily']) pricePeriod!: 'one_time' | 'monthly' | 'weekly' | 'daily';
}
