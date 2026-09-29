"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const env_validation_1 = require("./common/config/env.validation");
const observability_module_1 = require("./common/observability/observability.module");
const auth_module_1 = require("./common/auth/auth.module");
const metrics_controller_1 = require("./common/observability/metrics.controller");
const database_module_1 = require("./infrastructure/database.module");
const health_module_1 = require("./modules/health/health.module");
const properties_module_1 = require("./modules/properties/properties.module");
const listings_module_1 = require("./modules/listings/listings.module");
const search_module_1 = require("./modules/search/search.module");
const iam_module_1 = require("./modules/iam/iam.module");
const authorization_module_1 = require("./modules/authorization/authorization.module");
const commission_module_1 = require("./modules/commission/commission.module");
const billing_module_1 = require("./modules/billing/billing.module");
const advertising_module_1 = require("./modules/advertising/advertising.module");
const i18n_module_1 = require("./modules/i18n/i18n.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const media_module_1 = require("./modules/media/media.module");
const legal_module_1 = require("./modules/legal/legal.module");
const admin_module_1 = require("./modules/admin/admin.module");
let AppModule = class AppModule {
    configure(_consumer) {
        // Request lifecycle hooks (request id, trace id, timing, metrics) are
        // registered as Fastify hooks in main.ts — they must wrap ALL routes
        // including Swagger, which Nest middleware does not cover.
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, validate: env_validation_1.validateEnvironment }),
            observability_module_1.ObservabilityModule,
            auth_module_1.AuthModule,
            database_module_1.DatabaseModule,
            health_module_1.HealthModule,
            iam_module_1.IamModule,
            authorization_module_1.AuthorizationModule,
            properties_module_1.PropertiesModule,
            listings_module_1.ListingsModule,
            search_module_1.SearchModule,
            commission_module_1.CommissionModule,
            billing_module_1.BillingModule,
            advertising_module_1.AdvertisingModule,
            i18n_module_1.I18nModule,
            notifications_module_1.NotificationsModule,
            media_module_1.MediaModule,
            legal_module_1.LegalModule,
            admin_module_1.AdminModule,
        ],
        controllers: [metrics_controller_1.MetricsController],
    })
], AppModule);
