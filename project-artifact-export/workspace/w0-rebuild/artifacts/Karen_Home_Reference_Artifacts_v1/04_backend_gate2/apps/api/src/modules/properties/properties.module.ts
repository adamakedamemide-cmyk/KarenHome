import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database.module';
import { PropertiesController } from './presentation/properties.controller';
import { CreatePropertyHandler } from './application/create-property.handler';
import { AssignOwnerHandler } from './application/assign-owner.handler';

@Module({
  imports: [DatabaseModule],
  controllers: [PropertiesController],
  providers: [CreatePropertyHandler, AssignOwnerHandler],
})
export class PropertiesModule {}
