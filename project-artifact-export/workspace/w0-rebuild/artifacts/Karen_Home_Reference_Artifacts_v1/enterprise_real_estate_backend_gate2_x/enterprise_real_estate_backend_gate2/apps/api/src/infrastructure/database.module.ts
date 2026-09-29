import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { PostgresDatabase, IamRepository, PropertyRepository, ListingRepository, OutboxRepository, AuditRepository } from '@platform/db';
import { AppConfig } from '../common/config/app-config';

@Global()
@Module({
  providers: [
    AppConfig,
    {
      provide: PostgresDatabase,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => new PostgresDatabase({
        connectionString: config.databaseUrl,
        max: config.databasePoolMax,
        ssl: config.databaseSsl ? { rejectUnauthorized: true } : false,
      }),
    },
    { provide: IamRepository, inject: [PostgresDatabase], useFactory: (db: PostgresDatabase) => new IamRepository(db) },
    { provide: PropertyRepository, inject: [PostgresDatabase], useFactory: (db: PostgresDatabase) => new PropertyRepository(db) },
    { provide: ListingRepository, inject: [PostgresDatabase], useFactory: (db: PostgresDatabase) => new ListingRepository(db) },
    { provide: OutboxRepository, inject: [PostgresDatabase], useFactory: (db: PostgresDatabase) => new OutboxRepository(db) },
    { provide: AuditRepository, inject: [PostgresDatabase], useFactory: (db: PostgresDatabase) => new AuditRepository(db) },
  ],
  exports: [PostgresDatabase, IamRepository, PropertyRepository, ListingRepository, OutboxRepository, AuditRepository],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(private readonly db: PostgresDatabase) {}
  async onApplicationShutdown(): Promise<void> { await this.db.close(); }
}
