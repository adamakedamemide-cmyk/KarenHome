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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegalModule = exports.LegalAgreementsController = exports.LegalAgreementsService = exports.AcceptAgreementDto = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const db_1 = require("@platform/db");
const access_token_guard_1 = require("../../common/auth/access-token.guard");
const current_user_decorator_1 = require("../../common/auth/current-user.decorator");
const database_module_1 = require("../../infrastructure/database.module");
class AcceptAgreementDto {
    version;
}
exports.AcceptAgreementDto = AcceptAgreementDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], AcceptAgreementDto.prototype, "version", void 0);
let LegalAgreementsService = class LegalAgreementsService {
    db;
    constructor(db) {
        this.db = db;
    }
    async accept(input) {
        await this.db.query(`INSERT INTO legal.user_agreement_acceptances(user_id, agreement_code, agreement_version, ip, request_id)
       VALUES ($1::uuid, $2, $3, $4::inet, $5::uuid)
       ON CONFLICT (user_id, agreement_code, agreement_version) DO NOTHING`, [input.userId, input.code, input.version, input.ip ?? null, input.requestId ?? null]);
        return { accepted: true };
    }
    async hasAccepted(userId, code, version) {
        const r = await this.db.query(`SELECT EXISTS (SELECT 1 FROM legal.user_agreement_acceptances WHERE user_id = $1::uuid AND agreement_code = $2 AND agreement_version >= $3) AS exists`, [userId, code, version]);
        return r.rows[0]?.exists ?? false;
    }
};
exports.LegalAgreementsService = LegalAgreementsService;
exports.LegalAgreementsService = LegalAgreementsService = __decorate([
    (0, common_2.Injectable)(),
    __metadata("design:paramtypes", [db_1.PostgresDatabase])
], LegalAgreementsService);
let LegalAgreementsController = class LegalAgreementsController {
    service;
    constructor(service) {
        this.service = service;
    }
    async accept(code, dto, user, request) {
        const data = await this.service.accept({
            userId: user.id,
            code,
            version: dto.version,
            ip: request.ip,
            requestId: String(request.id ?? ''),
        });
        return { data };
    }
};
exports.LegalAgreementsController = LegalAgreementsController;
__decorate([
    (0, common_1.Post)(':code/accept'),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AcceptAgreementDto, Object, Object]),
    __metadata("design:returntype", Promise)
], LegalAgreementsController.prototype, "accept", null);
exports.LegalAgreementsController = LegalAgreementsController = __decorate([
    (0, common_1.Controller)('legal/agreements'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __metadata("design:paramtypes", [LegalAgreementsService])
], LegalAgreementsController);
let LegalModule = class LegalModule {
};
exports.LegalModule = LegalModule;
exports.LegalModule = LegalModule = __decorate([
    (0, common_2.Module)({
        imports: [database_module_1.DatabaseModule],
        controllers: [LegalAgreementsController],
        providers: [LegalAgreementsService],
        exports: [LegalAgreementsService],
    })
], LegalModule);
