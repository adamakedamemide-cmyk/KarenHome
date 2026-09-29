import { Controller, Get, Module, ServiceUnavailableException } from '@nestjs/common';
import { PostgresDatabase } from '@platform/db';

@Controller('health')
class HealthController {
  constructor(private readonly db: PostgresDatabase) {}

  @Get('live') live(): { status: 'ok' } { return { status: 'ok' }; }

  @Get('ready')
  async ready(): Promise<{ status: 'ok' }> {
    try { await this.db.healthcheck(); return { status: 'ok' }; }
    catch { throw new ServiceUnavailableException({ code: 'DEPENDENCY_UNAVAILABLE', message: 'Database is unavailable' }); }
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
