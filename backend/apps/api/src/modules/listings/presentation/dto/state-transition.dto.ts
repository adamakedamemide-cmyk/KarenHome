import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
export class StateTransitionDto {
  @IsNumber() @Min(1) expectedVersion!: number;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
