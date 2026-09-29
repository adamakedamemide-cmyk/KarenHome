import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PropertyRepository } from '@platform/db';
import type { AssignOwnerDto } from '../presentation/dto/assign-owner.dto';

@Injectable()
export class AssignOwnerHandler {
  constructor(private readonly repository: PropertyRepository) {}

  async execute(propertyId: string, dto: AssignOwnerDto, actorUserId: string) {
    const manageable = await this.repository.canManage(propertyId, actorUserId);
    if (!manageable) throw new ForbiddenException({ code: 'RESOURCE_NOT_OWNED', message: 'Property is not managed by the current user' });
    if ((dto.userId ? 1 : 0) + (dto.organizationId ? 1 : 0) !== 1) throw new ForbiddenException({ code: 'VALIDATION_FAILED', message: 'Exactly one owner principal is required' });
    try {
      const owner = await this.repository.assignOwner({ propertyId, userId: dto.userId, organizationId: dto.organizationId, ownershipShare: dto.ownershipShare }, { actorUserId });
      return { data: owner };
    } catch (error) {
      if (error instanceof Error && error.message === 'PROPERTY_NOT_FOUND') throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Property not found' });
      throw error;
    }
  }
}
