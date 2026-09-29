import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database.module';
import { PermissionsGuard } from '../../common/auth/permissions.guard';

@Global()
@Module({ imports: [DatabaseModule], providers: [PermissionsGuard], exports: [PermissionsGuard] })
export class AuthorizationModule {}
