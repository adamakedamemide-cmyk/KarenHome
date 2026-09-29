import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CreatePropertyDto } from '../presentation/dto/create-property.dto';
import { PropertyRepository } from '../domain/property.repository';
@Injectable()
export class CreatePropertyHandler {
  constructor(private readonly repository:PropertyRepository){}
  async execute(dto:CreatePropertyDto){
    const property={id:randomUUID(),propertyTypeId:dto.propertyTypeId,areaTotalM2:dto.areaTotalM2,rooms:dto.rooms??null,status:'draft' as const};
    await this.repository.insert(property); return {data:property};
  }
}
