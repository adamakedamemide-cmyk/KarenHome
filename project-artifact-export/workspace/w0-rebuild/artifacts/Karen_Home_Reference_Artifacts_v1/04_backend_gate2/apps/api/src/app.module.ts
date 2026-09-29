import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './common/config/env.validation';
import { HealthModule } from './modules/health/health.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { ListingsModule } from './modules/listings/listings.module';
import { SearchModule } from './modules/search/search.module';
import { DatabaseModule } from './infrastructure/database.module';
import { IamModule } from './modules/iam/iam.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), DatabaseModule, HealthModule, IamModule, AuthorizationModule, PropertiesModule, ListingsModule, SearchModule] })
export class AppModule {}
