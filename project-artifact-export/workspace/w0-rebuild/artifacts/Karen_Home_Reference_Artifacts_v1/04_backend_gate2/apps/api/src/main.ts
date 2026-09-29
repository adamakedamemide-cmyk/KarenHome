import { ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/errors/http-exception.filter';
import { AppConfig } from './common/config/app-config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ trustProxy: true, bodyLimit: 2 * 1024 * 1024, genReqId: () => randomUUID() }));
  const config = app.get(AppConfig);
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: false, credentials: false });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, forbidUnknownValues: true, validationError: { target: false, value: false } }));
  if (config.docsEnabled) {
    const cfg = new DocumentBuilder().setTitle('Enterprise Real Estate Platform API').setVersion('1.0.0').addBearerAuth().build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, cfg));
  }
  await app.listen(config.port, '0.0.0.0');
}
void bootstrap();
