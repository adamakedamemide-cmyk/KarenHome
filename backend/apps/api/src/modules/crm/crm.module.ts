import { Module } from '@nestjs/common';
import { CrmService } from './application/crm.service';
import { CrmController } from './presentation/crm.controller';

@Module({
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
