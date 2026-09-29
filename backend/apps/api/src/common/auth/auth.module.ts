import { Global, Module } from '@nestjs/common';
import { AccessTokenService } from './access-token.service';

/** Global auth primitives shared by every module that mounts guards. */
@Global()
@Module({
  providers: [AccessTokenService],
  exports: [AccessTokenService],
})
export class AuthModule {}
