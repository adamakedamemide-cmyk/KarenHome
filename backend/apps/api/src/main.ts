import { ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/errors/http-exception.filter';
import { AppConfig } from './common/config/app-config';
import { RateLimitService } from './common/http/rate-limit.service';
import { MetricsRegistry } from './common/observability/metrics';
import { StructuredLogger } from './common/observability/logger';

interface RequestTimings {
  startedNs: bigint;
  traceId: string;
}

type RequestWithTimings = FastifyRequest & { timings?: RequestTimings };

const AUTH_ROUTES = new Set(['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh', '/api/v1/auth/password/reset-request']);
const SEARCH_ROUTES = new Set(['/api/v1/search/listings']);
const PUBLIC_RATE_EXEMPT = new Set(['/api/v1/metrics', '/api/v1/health/live', '/api/v1/health/ready']);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({
    trustProxy: true,
    bodyLimit: 2 * 1024 * 1024,
    genReqId: () => randomUUID(),
  }));
  const config = app.get(AppConfig);
  const metrics = app.get(MetricsRegistry);
  const logger = app.get(StructuredLogger);
  const rateLimit = new RateLimitService();

  const fastify = app.getHttpAdapter().getInstance() as FastifyInstance;

  // §19 — request id / trace id propagation.
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const typed = request as RequestWithTimings;
    const incomingTrace = request.headers['x-trace-id'];
    const traceId = typeof incomingTrace === 'string' && incomingTrace.length <= 128 ? incomingTrace : randomUUID();
    typed.timings = { startedNs: process.hrtime.bigint(), traceId };
    reply.header('x-request-id', String(request.id));
    reply.header('x-trace-id', traceId);
  });

  // §17 — rate limit policy per route class (auth / search / default).
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const route = (request.raw.url ?? '').split('?')[0] ?? '';
    if (PUBLIC_RATE_EXEMPT.has(route)) return;
    const policy = AUTH_ROUTES.has(route) ? 'auth' : SEARCH_ROUTES.has(route) ? 'search' : 'default';
    const decision = await rateLimit.enforce(policy, request.ip);
    if (!decision.allowed) {
      metrics.counter('rate_limited_total', 'Rate limited requests', { policy });
      reply.code(429).header('retry-after', String(decision.retryAfterSeconds)).send({
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.', requestId: String(request.id) },
      });
    }
  });

  // §19 — access log + http duration metrics.
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const typed = request as RequestWithTimings;
    const durationMs = typed.timings ? Number(process.hrtime.bigint() - typed.timings.startedNs) / 1_000_000 : 0;
    const route = (request.raw.url ?? 'unknown').split('?')[0] ?? 'unknown';
    metrics.counter('http_requests_total', 'HTTP requests', { method: request.method, status: String(reply.statusCode) });
    metrics.histogram('http_request_duration_ms', 'HTTP request duration (ms)', { method: request.method }, durationMs);
    logger.info('http_request', {
      requestId: String(request.id),
      traceId: typed.timings?.traceId,
      method: request.method,
      route,
      status: reply.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    });
  });

  await fastify.register(multipart, { limits: { fileSize: config.mediaMaxBytes, files: 1 } });

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: false, credentials: false });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, forbidUnknownValues: true, validationError: { target: false, value: false } }));
  if (config.docsEnabled) {
    const cfg = new DocumentBuilder()
      .setTitle('Enterprise Real Estate Platform API')
      .setVersion('1.1.0')
      .setDescription('Karen Home — Gate 4 backend. All endpoints under /api/v1; errors follow the code-based error model.')
      .addBearerAuth()
      .addTag('auth', 'IAM: registration, login, refresh rotation, MFA, OAuth, verification')
      .addTag('properties')
      .addTag('listings')
      .addTag('search')
      .addTag('commission')
      .addTag('billing')
      .addTag('ads')
      .addTag('notifications')
      .addTag('media')
      .addTag('i18n')
      .addTag('admin')
      .addTag('health')
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, cfg));
  }
  await app.listen(config.port, '0.0.0.0');
}
void bootstrap();
