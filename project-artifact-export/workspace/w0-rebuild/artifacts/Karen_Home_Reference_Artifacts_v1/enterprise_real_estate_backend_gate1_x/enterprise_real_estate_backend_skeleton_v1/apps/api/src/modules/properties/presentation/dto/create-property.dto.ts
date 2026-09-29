import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
export class CreatePropertyDto {
  @IsUUID() propertyTypeId!: string;
  @IsNumber() @Min(0) areaTotalM2!: number;
  @IsOptional() @IsNumber() @Min(0) rooms?: number;
}
