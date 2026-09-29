import { Module } from '@nestjs/common';
import { IamController } from './presentation/iam.controller';
import { IamService } from './application/iam.service';
import { AccessTokenService } from '../../common/auth/access-token.service';
import { DatabaseModule } from '../../infrastructure/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [IamController],
  providers: [IamService, AccessTokenService],
  exports: [IamService, AccessTokenService],
})
export class IamModule {}
