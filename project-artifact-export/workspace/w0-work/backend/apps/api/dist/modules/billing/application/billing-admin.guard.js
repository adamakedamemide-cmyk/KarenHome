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
exports.BillingAdminGuard = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@platform/db");
/**
 * Platform-admin gate for billing plan administration (§14).
 * Resolution rides the 0030 effective-permission engine: organization roles
 * AND personal-scope grants are both honored.
 */
let BillingAdminGuard = class BillingAdminGuard {
    iam;
    constructor(iam) {
        this.iam = iam;
    }
    async requirePlatformAdmin(actor, organizationId) {
        const permissions = await this.iam.listPermissionCodesForUser(actor.id, organizationId);
        if (!permissions.includes('platform.admin')) {
            throw new common_1.ForbiddenException({ code: 'FORBIDDEN', message: 'Platform admin permission is required' });
        }
    }
};
exports.BillingAdminGuard = BillingAdminGuard;
exports.BillingAdminGuard = BillingAdminGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_1.IamRepository])
], BillingAdminGuard);
