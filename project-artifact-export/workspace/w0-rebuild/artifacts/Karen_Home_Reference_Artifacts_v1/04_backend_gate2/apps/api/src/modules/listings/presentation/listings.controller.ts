import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../../common/auth/access-token.guard';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '@platform/contracts';
import { ListingRepository } from '@platform/db';
import { ListingService } from '../application/listing.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { StateTransitionDto } from './dto/state-transition.dto';
import { AttachMediaDto } from './dto/attach-media.dto';

@Controller('listings')
export class ListingsController {
  constructor(private readonly service: ListingService, private readonly repository: ListingRepository) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  create(@Body() dto: CreateListingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  @Post(':id/submit')
  @UseGuards(AccessTokenGuard)
  submit(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'submit', dto, user);
  }

  @Post(':id/publish')
  @UseGuards(AccessTokenGuard)
  publish(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'publish', dto, user);
  }

  @Post(':id/pause')
  @UseGuards(AccessTokenGuard)
  pause(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'pause', dto, user);
  }

  @Post(':id/sold')
  @UseGuards(AccessTokenGuard)
  sold(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'sold', dto, user);
  }

  @Post(':id/rented')
  @UseGuards(AccessTokenGuard)
  rented(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'rented', dto, user);
  }

  @Post(':id/archive')
  @UseGuards(AccessTokenGuard)
  archive(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'archive', dto, user);
  }

  @Post(':id/media')
  @UseGuards(AccessTokenGuard)
  attachMedia(@Param('id') id: string, @Body() dto: AttachMediaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.attachMedia(id, dto, user);
  }

  @Get(':id')
  @UseGuards(AccessTokenGuard)
  async get(@Param('id') id: string) {
    const listing = await this.repository.getById(id);
    if (!listing) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Listing not found' });
    return { data: listing };
  }
}
