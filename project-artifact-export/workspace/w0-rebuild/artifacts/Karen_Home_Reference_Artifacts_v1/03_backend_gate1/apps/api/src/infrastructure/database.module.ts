import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { PostgresDatabase, IamRepository } from '@platform/db';
import { AppConfig } from '../common/config/app-config';

@Global()
@Module({
  providers: [
    AppConfig,
    {
      provide: PostgresDatabase,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => new PostgresDatabase({ connectionString: config.databaseUrl }),
    },
    { provide: IamRepository, inject: [PostgresDatabase], useFactory: (db: PostgresDatabase) => new IamRepository(db) },
  ],
  exports: [PostgresDatabase, IamRepository],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(private readonly db: PostgresDatabase) {}
  async onApplicationShutdown() { await this.db.close(); }
}
