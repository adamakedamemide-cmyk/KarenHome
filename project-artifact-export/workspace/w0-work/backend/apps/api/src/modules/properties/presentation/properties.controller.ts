import { Body, Controller, Get, ForbiddenException, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../../common/auth/access-token.guard';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '@platform/contracts';
import { CreatePropertyHandler } from '../application/create-property.handler';
import { AssignOwnerHandler } from '../application/assign-owner.handler';
import { CreatePropertyDto } from './dto/create-property.dto';
import { AssignOwnerDto } from './dto/assign-owner.dto';
import { PropertyRepository } from '@platform/db';

@Controller('properties')
@UseGuards(AccessTokenGuard)
export class PropertiesController {
  constructor(
    private readonly createHandler: CreatePropertyHandler,
    private readonly ownerHandler: AssignOwnerHandler,
    private readonly repository: PropertyRepository,
  ) {}

  @Post()
  create(@Body() dto: CreatePropertyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.createHandler.execute(dto, user.id);
  }

  @Post(':id/owners')
  assignOwner(@Param('id') id: string, @Body() dto: AssignOwnerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ownerHandler.execute(id, dto, user.id);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const property = await this.repository.getById(id);
    if (!property) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Property not found' });
    return { data: property };
  }

  @Post(':id/location')
  async addLocation(
    @Param('id') id: string,
    @Body() dto: { geoNodeId?: string; addressLine1?: string; postalCode?: string; lon?: number; lat?: number },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const manageable = await this.repository.canManage(id, user.id);
    if (!manageable) throw new ForbiddenException({ code: 'RESOURCE_NOT_OWNED', message: 'Property is not managed by the current user' });
    try {
      const location = await this.repository.addLocation({
        propertyId: id, geoNodeId: dto.geoNodeId, addressLine1: dto.addressLine1,
        postalCode: dto.postalCode, lon: dto.lon, lat: dto.lat,
      }, { actorUserId: user.id });
      if (dto.geoNodeId) await this.repository.markLocationPrimary(id, location.id, { actorUserId: user.id });
      return { data: location };
    } catch (error) {
      if (error instanceof Error && error.message === 'PROPERTY_NOT_FOUND') {
        throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Property not found' });
      }
      throw error;
    }
  }
}
