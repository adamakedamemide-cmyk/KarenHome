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
exports.AssignOwnerHandler = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@platform/db");
let AssignOwnerHandler = class AssignOwnerHandler {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async execute(propertyId, dto, actorUserId) {
        const manageable = await this.repository.canManage(propertyId, actorUserId);
        if (!manageable)
            throw new common_1.ForbiddenException({ code: 'RESOURCE_NOT_OWNED', message: 'Property is not managed by the current user' });
        if ((dto.userId ? 1 : 0) + (dto.organizationId ? 1 : 0) !== 1)
            throw new common_1.ForbiddenException({ code: 'VALIDATION_FAILED', message: 'Exactly one owner principal is required' });
        try {
            const owner = await this.repository.assignOwner({ propertyId, userId: dto.userId, organizationId: dto.organizationId, ownershipShare: dto.ownershipShare }, { actorUserId });
            return { data: owner };
        }
        catch (error) {
            if (error instanceof Error && error.message === 'PROPERTY_NOT_FOUND')
                throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Property not found' });
            throw error;
        }
    }
};
exports.AssignOwnerHandler = AssignOwnerHandler;
exports.AssignOwnerHandler = AssignOwnerHandler = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_1.PropertyRepository])
], AssignOwnerHandler);
