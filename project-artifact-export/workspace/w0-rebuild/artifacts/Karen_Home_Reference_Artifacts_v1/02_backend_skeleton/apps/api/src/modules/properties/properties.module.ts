import { Module } from '@nestjs/common';
import { PropertiesController } from './presentation/properties.controller';
import { CreatePropertyHandler } from './application/create-property.handler';
import { PropertyRepository } from './domain/property.repository';
import { InMemoryPropertyRepository } from './infrastructure/in-memory-property.repository';
@Module({controllers:[PropertiesController],providers:[CreatePropertyHandler,{provide:PropertyRepository,useClass:InMemoryPropertyRepository}],exports:[PropertyRepository]})
export class PropertiesModule {}
