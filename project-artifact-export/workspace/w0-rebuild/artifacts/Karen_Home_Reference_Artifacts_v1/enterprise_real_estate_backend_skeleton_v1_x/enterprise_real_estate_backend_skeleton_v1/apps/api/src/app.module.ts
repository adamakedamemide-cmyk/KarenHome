import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { ListingsModule } from './modules/listings/listings.module';
import { SearchModule } from './modules/search/search.module';
@Module({imports:[HealthModule,PropertiesModule,ListingsModule,SearchModule]})
export class AppModule {}
