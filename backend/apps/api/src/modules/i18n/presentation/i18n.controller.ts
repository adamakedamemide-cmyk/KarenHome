import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { AccessTokenGuard } from '../../../common/auth/access-token.guard';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { IamRepository, ListingRepository } from '@platform/db';
import type { AuthenticatedUser } from '@platform/contracts';
import { I18nService } from '../application/i18n.service';

export class UpsertListingTranslationDto {
  @IsString() @Matches(/^[a-z]{2}(-[A-Z]{2})?$/) locale!: string;
  @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsString() @MinLength(1) @MaxLength(200) slug!: string;
  @IsOptional() @IsString() @MaxLength(200) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(300) seoDescription?: string;
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED']) status?: 'DRAFT' | 'PUBLISHED';
}

/** Permission gate: listing.update via org roles OR personal-scope grants (0030). */
@Injectable()
export class TranslationPermissionGuard {
  constructor(private readonly iam: IamRepository) {}

  async requireListingEdit(userId: string, organizationId?: string): Promise<void> {
    const permissions = await this.iam.listPermissionCodesForUser(userId, organizationId);
    if (!permissions.includes('listing.update')) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'listing.update permission is required' });
    }
  }
}

@Controller('i18n')
export class I18nController {
  constructor(
    private readonly i18n: I18nService,
    private readonly listings: ListingRepository,
    private readonly permissionGuard: TranslationPermissionGuard,
  ) {}

  @Get('config')
  async config(@Query('locale') locale: string) {
    const chain = await this.i18n.resolveFallbackChain(locale || 'en');
    return { data: { locale: locale || 'en', fallbackChain: chain } };
  }

  @Get('listings/:id')
  async translateListing(@Param('id') id: string, @Query('locale') locale: string) {
    const effective = await this.i18n.translateListing(id, locale || 'en');
    if (!effective) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Listing not found' });
    return { data: effective };
  }

  @Post('listings/:id/translations')
  @UseGuards(AccessTokenGuard)
  async upsertTranslation(@Param('id') id: string, @Body() dto: UpsertListingTranslationDto, @CurrentUser() user: AuthenticatedUser) {
    const listing = await this.listings.getById(id);
    if (!listing) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Listing not found' });
    await this.permissionGuard.requireListingEdit(user.id, listing.managingOrganizationId ?? undefined);
    await this.i18n.upsertListingTranslation({
      listingId: id,
      locale: dto.locale,
      title: dto.title,
      description: dto.description,
      slug: dto.slug,
      seoTitle: dto.seoTitle,
      seoDescription: dto.seoDescription,
      status: dto.status,
    });
    return { data: { upserted: true, locale: dto.locale } };
  }
}
