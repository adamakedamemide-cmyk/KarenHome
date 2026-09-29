"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@platform/db");
const app_config_1 = require("../common/config/app-config");
let DatabaseModule = class DatabaseModule {
    db;
    constructor(db) {
        this.db = db;
    }
    async onApplicationShutdown() { await this.db.close(); }
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            app_config_1.AppConfig,
            {
                provide: db_1.PostgresDatabase,
                inject: [app_config_1.AppConfig],
                useFactory: (config) => new db_1.PostgresDatabase({
                    connectionString: config.databaseUrl,
                    max: config.databasePoolMax,
                    ssl: config.databaseSsl ? { rejectUnauthorized: true } : false,
                }),
            },
            { provide: db_1.IamRepository, inject: [db_1.PostgresDatabase], useFactory: (db) => new db_1.IamRepository(db) },
            { provide: db_1.IamHardeningRepository, inject: [db_1.PostgresDatabase], useFactory: (db) => new db_1.IamHardeningRepository(db) },
            { provide: db_1.PropertyRepository, inject: [db_1.PostgresDatabase], useFactory: (db) => new db_1.PropertyRepository(db) },
            { provide: db_1.ListingRepository, inject: [db_1.PostgresDatabase], useFactory: (db) => new db_1.ListingRepository(db) },
            { provide: db_1.OutboxRepository, inject: [db_1.PostgresDatabase], useFactory: (db) => new db_1.OutboxRepository(db) },
            { provide: db_1.AuditRepository, inject: [db_1.PostgresDatabase], useFactory: (db) => new db_1.AuditRepository(db) },
            { provide: db_1.JobRepository, inject: [db_1.PostgresDatabase], useFactory: (db) => new db_1.JobRepository(db) },
            { provide: db_1.CommissionRepository, inject: [db_1.PostgresDatabase], useFactory: (db) => new db_1.CommissionRepository(db) },
            { provide: db_1.BillingRepository, inject: [db_1.PostgresDatabase], useFactory: (db) => new db_1.BillingRepository(db) },
            { provide: db_1.AdvertisingRepository, inject: [db_1.PostgresDatabase], useFactory: (db) => new db_1.AdvertisingRepository(db) },
            { provide: db_1.NotificationRepository, inject: [db_1.PostgresDatabase], useFactory: (db) => new db_1.NotificationRepository(db) },
            { provide: db_1.MediaRepository, inject: [db_1.PostgresDatabase], useFactory: (db) => new db_1.MediaRepository(db) },
            { provide: db_1.SearchIndexRepository, inject: [db_1.PostgresDatabase], useFactory: (db) => new db_1.SearchIndexRepository(db) },
            { provide: db_1.PublicationPolicyRepository, inject: [db_1.PostgresDatabase], useFactory: (db) => new db_1.PublicationPolicyRepository(db) },
            { provide: db_1.AntiBotRepository, inject: [db_1.PostgresDatabase], useFactory: (db) => new db_1.AntiBotRepository(db) },
        ],
        exports: [
            app_config_1.AppConfig, db_1.PostgresDatabase, db_1.IamRepository, db_1.IamHardeningRepository, db_1.PropertyRepository, db_1.ListingRepository, db_1.OutboxRepository,
            db_1.AuditRepository, db_1.JobRepository, db_1.CommissionRepository, db_1.BillingRepository, db_1.AdvertisingRepository,
            db_1.NotificationRepository, db_1.MediaRepository, db_1.SearchIndexRepository, db_1.PublicationPolicyRepository, db_1.AntiBotRepository,
        ],
    }),
    __metadata("design:paramtypes", [db_1.PostgresDatabase])
], DatabaseModule);
