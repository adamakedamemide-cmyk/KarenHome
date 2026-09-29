import { IsNumberString, IsOptional, IsUUID, Matches, ValidateIf } from 'class-validator';

export class AssignOwnerDto {
  @IsOptional() @ValidateIf((o: AssignOwnerDto) => !o.organizationId) @IsUUID() userId?: string;
  @IsOptional() @ValidateIf((o: AssignOwnerDto) => !o.userId) @IsUUID() organizationId?: string;
  @IsNumberString() @Matches(/^\d{1,3}(\.\d{1,4})?$/) ownershipShare!: string;
}
