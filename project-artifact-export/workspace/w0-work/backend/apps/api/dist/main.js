"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const multipart_1 = __importDefault(require("@fastify/multipart"));
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/errors/http-exception.filter");
const app_config_1 = require("./common/config/app-config");
const rate_limit_service_1 = require("./common/http/rate-limit.service");
const metrics_1 = require("./common/observability/metrics");
const logger_1 = require("./common/observability/logger");
const AUTH_ROUTES = new Set(['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh', '/api/v1/auth/password/reset-request']);
const SEARCH_ROUTES = new Set(['/api/v1/search/listings']);
const PUBLIC_RATE_EXEMPT = new Set(['/api/v1/metrics', '/api/v1/health/live', '/api/v1/health/ready']);
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_fastify_1.FastifyAdapter({
        trustProxy: true,
        bodyLimit: 2 * 1024 * 1024,
        genReqId: () => (0, node_crypto_1.randomUUID)(),
    }));
    const config = app.get(app_config_1.AppConfig);
    const metrics = app.get(metrics_1.MetricsRegistry);
    const logger = app.get(logger_1.StructuredLogger);
    const rateLimit = new rate_limit_service_1.RateLimitService();
    const fastify = app.getHttpAdapter().getInstance();
    // §19 — request id / trace id propagation.
    fastify.addHook('onRequest', async (request, reply) => {
        const typed = request;
        const incomingTrace = request.headers['x-trace-id'];
        const traceId = typeof incomingTrace === 'string' && incomingTrace.length <= 128 ? incomingTrace : (0, node_crypto_1.randomUUID)();
        typed.timings = { startedNs: process.hrtime.bigint(), traceId };
        reply.header('x-request-id', String(request.id));
        reply.header('x-trace-id', traceId);
    });
    // §17 — rate limit policy per route class (auth / search / default).
    fastify.addHook('preHandler', async (request, reply) => {
        const route = (request.raw.url ?? '').split('?')[0] ?? '';
        if (PUBLIC_RATE_EXEMPT.has(route))
            return;
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
    fastify.addHook('onResponse', async (request, reply) => {
        const typed = request;
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
    await fastify.register(multipart_1.default, { limits: { fileSize: config.mediaMaxBytes, files: 1 } });
    app.setGlobalPrefix('api/v1');
    app.enableCors({ origin: false, credentials: false });
    app.useGlobalFilters(new http_exception_filter_1.ApiExceptionFilter());
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, forbidUnknownValues: true, validationError: { target: false, value: false } }));
    if (config.docsEnabled) {
        const cfg = new swagger_1.DocumentBuilder()
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
        swagger_1.SwaggerModule.setup('docs', app, swagger_1.SwaggerModule.createDocument(app, cfg));
    }
    await app.listen(config.port, '0.0.0.0');
}
void bootstrap();
