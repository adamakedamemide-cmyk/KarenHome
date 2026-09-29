import { Injectable } from '@nestjs/common';
import { PropertyRepository } from '@platform/db';
import type { CreatePropertyDto } from '../presentation/dto/create-property.dto';

@Injectable()
export class CreatePropertyHandler {
  constructor(private readonly repository: PropertyRepository) {}

  async execute(dto: CreatePropertyDto, actorUserId: string) {
    const property = await this.repository.create({
      propertyTypeId: dto.propertyTypeId,
      areaTotalM2: dto.areaTotalM2,
      rooms: dto.rooms,
      createdByUserId: actorUserId,
    });
    return { data: property };
  }
}
