import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database.module';
import { BillingController } from './presentation/billing.controller';
import { BillingService } from './application/billing.service';
import { BillingAdminGuard } from './application/billing-admin.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [BillingController],
  providers: [BillingService, BillingAdminGuard],
  exports: [BillingService],
})
export class BillingModule {}
