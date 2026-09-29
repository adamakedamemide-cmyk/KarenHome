import { IsBoolean, IsIn, IsUUID } from 'class-validator';
export class AttachMediaDto {
  @IsUUID() mediaAssetId!: string;
  @IsIn(['photo', 'video', 'floor_plan', 'virtual_tour', 'document', 'other']) mediaType!: 'photo' | 'video' | 'floor_plan' | 'virtual_tour' | 'document' | 'other';
  @IsBoolean() isCover!: boolean;
}
