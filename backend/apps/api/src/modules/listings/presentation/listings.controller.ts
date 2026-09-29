import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../../common/auth/access-token.guard';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '@platform/contracts';
import { ListingRepository } from '@platform/db';
import { ListingService, type ListingAction } from '../application/listing.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { StateTransitionDto } from './dto/state-transition.dto';
import { AttachMediaDto } from './dto/attach-media.dto';
import { ListingSearchQueryDto } from './dto/listing-search-query.dto';
import { ListingSearchService } from '../application/listing-search.service';

@Controller('listings')
export class ListingsController {
  constructor(
    private readonly service: ListingService,
    private readonly repository: ListingRepository,
    private readonly search: ListingSearchService,
  ) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  create(@Body() dto: CreateListingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  @Get()
  async list(@Query() query: ListingSearchQueryDto) {
    return this.search.search(query);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Get(':id/publication-readiness')
  @UseGuards(AccessTokenGuard)
  async readiness(@Param('id') id: string) {
    return this.service.publicationReadiness(id);
  }

  @Post(':id/transition')
  @UseGuards(AccessTokenGuard)
  async transition(
    @Param('id') id: string,
    @Body() dto: StateTransitionDto & { action: ListingAction },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.transition(id, dto.action, { expectedVersion: dto.expectedVersion, reason: dto.reason }, user);
  }

  // --- Canonical, per-action endpoints (§5) -----------------------------------
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  submit(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'submit', dto, user);
  }

  @Post(':id/submit-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  submitVerification(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'submit_verification', dto, user);
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  verify(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'verify', dto, user);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  reject(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'reject', dto, user);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  publish(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'publish', dto, user);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  pause(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'pause', dto, user);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  resume(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'resume', dto, user);
  }

  @Post(':id/reserve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  reserve(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'reserve', dto, user);
  }

  @Post(':id/under-contract')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  underContract(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'under_contract', dto, user);
  }

  @Post(':id/sold')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  sold(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'sold', dto, user);
  }

  @Post(':id/rented')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  rented(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'rented', dto, user);
  }

  @Post(':id/expire')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  expire(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'expire', dto, user);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  archive(@Param('id') id: string, @Body() dto: StateTransitionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.transition(id, 'archive', dto, user);
  }

  @Post(':id/media')
  @UseGuards(AccessTokenGuard)
  attachMedia(@Param('id') id: string, @Body() dto: AttachMediaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.attachMedia(id, dto, user);
  }
}
