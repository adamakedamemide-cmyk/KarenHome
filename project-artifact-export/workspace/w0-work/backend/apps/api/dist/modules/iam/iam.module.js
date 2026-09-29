"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IamModule = void 0;
const common_1 = require("@nestjs/common");
const iam_controller_1 = require("./presentation/iam.controller");
const iam_hardening_controller_1 = require("./presentation/iam-hardening.controller");
const iam_service_1 = require("./application/iam.service");
const iam_hardening_service_1 = require("./application/iam-hardening.service");
const antibot_service_1 = require("../../common/antibot/antibot.service");
const database_module_1 = require("../../infrastructure/database.module");
const auth_module_1 = require("../../common/auth/auth.module");
const oauth_providers_1 = require("./infrastructure/oauth-providers");
const oauth_providers_2 = require("./infrastructure/oauth-providers");
const app_config_1 = require("../../common/config/app-config");
let IamModule = class IamModule {
};
exports.IamModule = IamModule;
exports.IamModule = IamModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, auth_module_1.AuthModule],
        controllers: [iam_controller_1.IamController, iam_hardening_controller_1.IamHardeningController],
        providers: [
            iam_service_1.IamService,
            iam_hardening_service_1.IamHardeningService,
            antibot_service_1.AntiBotService,
            {
                provide: oauth_providers_1.OAuthProviderRegistry,
                inject: [app_config_1.AppConfig],
                useFactory: (config) => new oauth_providers_1.OAuthProviderRegistry([
                    config.oauthGoogleCredentials ? new oauth_providers_2.GoogleOAuthProvider(config.oauthGoogleCredentials.clientId, config.oauthGoogleCredentials.clientSecret) : null,
                    config.oauthFacebookCredentials ? new oauth_providers_2.FacebookOAuthProvider(config.oauthFacebookCredentials.clientId, config.oauthFacebookCredentials.clientSecret) : null,
                ]),
            },
        ],
        exports: [iam_service_1.IamService, iam_hardening_service_1.IamHardeningService, antibot_service_1.AntiBotService],
    })
], IamModule);
