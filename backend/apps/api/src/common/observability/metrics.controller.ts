import { Controller, Get, Header, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { MetricsRegistry } from './metrics';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsRegistry) {}

  @Get()
  @Header('content-type', 'text/plain; version=0.0.4')
  async scrape(@Res() reply: FastifyReply): Promise<void> {
    reply.send(this.metrics.renderPrometheus());
  }
}
