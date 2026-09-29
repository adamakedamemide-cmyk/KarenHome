import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
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
}
