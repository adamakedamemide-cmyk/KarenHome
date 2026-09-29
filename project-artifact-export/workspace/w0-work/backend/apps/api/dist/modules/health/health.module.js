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
exports.HealthModule = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@platform/db");
let HealthController = class HealthController {
    db;
    constructor(db) {
        this.db = db;
    }
    live() { return { status: 'ok' }; }
    async ready() {
        try {
            await this.db.healthcheck();
            return { status: 'ok' };
        }
        catch {
            throw new common_1.ServiceUnavailableException({ code: 'DEPENDENCY_UNAVAILABLE', message: 'Database is unavailable' });
        }
    }
};
__decorate([
    (0, common_1.Get)('live'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], HealthController.prototype, "live", null);
__decorate([
    (0, common_1.Get)('ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "ready", null);
HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [db_1.PostgresDatabase])
], HealthController);
let HealthModule = class HealthModule {
};
exports.HealthModule = HealthModule;
exports.HealthModule = HealthModule = __decorate([
    (0, common_1.Module)({ controllers: [HealthController] })
], HealthModule);
