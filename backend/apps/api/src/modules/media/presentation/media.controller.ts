import { createReadStream } from 'node:fs';
import { Controller, Get, NotFoundException, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { DomainError } from '@platform/contracts';
import { AccessTokenGuard } from '../../../common/auth/access-token.guard';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '@platform/contracts';
import { MediaService } from '../application/media.service';

type MultipartRequest = {
  file(): Promise<{
    file: NodeJS.ReadableStream;
    filename: string;
    mimetype: string;
  } | undefined>;
};

export const VARIANT_WIDTHS = [1920, 1280, 768, 320];

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('uploads')
  @UseGuards(AccessTokenGuard)
  async upload(@Req() request: FastifyRequest, @CurrentUser() user: AuthenticatedUser) {
    const parts = request as unknown as MultipartRequest;
    const data = await parts.file();
    if (!data) throw new DomainError('VALIDATION_ERROR', 'error.media_field_required');
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of data.file) {
      total += (chunk as Buffer).length;
      if (total > 104_857_600) throw new DomainError('MEDIA_TOO_LARGE', 'error.media_too_large');
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);
    const created = await this.media.intake({ buffer, declaredMime: data.mimetype, createdBy: user.id });
    return { data: created };
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const asset = await this.media.getAsset(id);
    if (!asset) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Media asset not found' });
    return { data: asset };
  }

  @Get(':id/variants/:width')
  async variant(@Param('id') id: string, @Param('width') width: string, @Res() reply: FastifyReply) {
    const numericWidth = Number(width);
    if (!VARIANT_WIDTHS.includes(numericWidth)) {
      throw new DomainError('VALIDATION_ERROR', 'error.media_variant_unsupported');
    }
    const found = await this.media.readVariant(id, numericWidth);
    if (!found) throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Variant not found' });
    reply.type('image/webp').send(createReadStream(found.filePath));
  }
}
