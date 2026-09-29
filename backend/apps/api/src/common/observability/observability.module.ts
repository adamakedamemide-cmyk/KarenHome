import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsRegistry } from './metrics';
import { StructuredLogger, loggerForConfig } from './logger';

@Global()
@Module({
  providers: [
    MetricsRegistry,
    {
      provide: StructuredLogger,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => loggerForConfig('karen-api', config),
    },
  ],
  exports: [MetricsRegistry, StructuredLogger],
})
export class ObservabilityModule {}
