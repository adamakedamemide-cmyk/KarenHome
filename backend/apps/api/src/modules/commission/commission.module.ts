import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database.module';
import { CommissionController } from './presentation/commission.controller';
import { CommissionEngineService } from './application/commission-engine.service';
import { CommissionSettlementService } from './application/commission-settlement.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CommissionController],
  providers: [CommissionEngineService, CommissionSettlementService],
  exports: [CommissionEngineService],
})
export class CommissionModule {}
