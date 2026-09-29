import { IsNumberString, IsOptional, IsUUID, Matches } from 'class-validator';

export class CreatePropertyDto {
  @IsUUID() propertyTypeId!: string;
  @IsNumberString() @Matches(/^\d+(\.\d{1,2})?$/) areaTotalM2!: string;
  @IsOptional() @IsNumberString() @Matches(/^\d+(\.\d{1})?$/) rooms?: string;
}
