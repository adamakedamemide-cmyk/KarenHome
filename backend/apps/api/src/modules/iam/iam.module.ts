import { Module } from '@nestjs/common';
import { IamController } from './presentation/iam.controller';
import { IamHardeningController } from './presentation/iam-hardening.controller';
import { IamService } from './application/iam.service';
import { IamHardeningService } from './application/iam-hardening.service';
import { AntiBotService } from '../../common/antibot/antibot.service';
import { DatabaseModule } from '../../infrastructure/database.module';
import { AuthModule } from '../../common/auth/auth.module';
import { OAuthProviderRegistry } from './infrastructure/oauth-providers';
import { GoogleOAuthProvider, FacebookOAuthProvider } from './infrastructure/oauth-providers';
import { AppConfig } from '../../common/config/app-config';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [IamController, IamHardeningController],
  providers: [
    IamService,
    IamHardeningService,
    AntiBotService,
    {
      provide: OAuthProviderRegistry,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => new OAuthProviderRegistry([
        config.oauthGoogleCredentials ? new GoogleOAuthProvider(config.oauthGoogleCredentials.clientId, config.oauthGoogleCredentials.clientSecret) : null,
        config.oauthFacebookCredentials ? new FacebookOAuthProvider(config.oauthFacebookCredentials.clientId, config.oauthFacebookCredentials.clientSecret) : null,
      ]),
    },
  ],
  exports: [IamService, IamHardeningService, AntiBotService],
})
export class IamModule {}
