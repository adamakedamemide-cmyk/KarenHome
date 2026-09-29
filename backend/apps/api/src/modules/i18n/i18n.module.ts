import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database.module';
import { I18nController, TranslationPermissionGuard } from './presentation/i18n.controller';
import { I18nService } from './application/i18n.service';

@Module({
  imports: [DatabaseModule],
  controllers: [I18nController],
  providers: [I18nService, TranslationPermissionGuard],
  exports: [I18nService],
})
export class I18nModule {}
