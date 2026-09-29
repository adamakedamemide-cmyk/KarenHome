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
exports.PropertiesController = void 0;
const common_1 = require("@nestjs/common");
const access_token_guard_1 = require("../../../common/auth/access-token.guard");
const current_user_decorator_1 = require("../../../common/auth/current-user.decorator");
const create_property_handler_1 = require("../application/create-property.handler");
const assign_owner_handler_1 = require("../application/assign-owner.handler");
const create_property_dto_1 = require("./dto/create-property.dto");
const assign_owner_dto_1 = require("./dto/assign-owner.dto");
const db_1 = require("@platform/db");
let PropertiesController = class PropertiesController {
    createHandler;
    ownerHandler;
    repository;
    constructor(createHandler, ownerHandler, repository) {
        this.createHandler = createHandler;
        this.ownerHandler = ownerHandler;
        this.repository = repository;
    }
    create(dto, user) {
        return this.createHandler.execute(dto, user.id);
    }
    assignOwner(id, dto, user) {
        return this.ownerHandler.execute(id, dto, user.id);
    }
    async get(id) {
        const property = await this.repository.getById(id);
        if (!property)
            throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Property not found' });
        return { data: property };
    }
    async addLocation(id, dto, user) {
        const manageable = await this.repository.canManage(id, user.id);
        if (!manageable)
            throw new common_1.ForbiddenException({ code: 'RESOURCE_NOT_OWNED', message: 'Property is not managed by the current user' });
        try {
            const location = await this.repository.addLocation({
                propertyId: id, geoNodeId: dto.geoNodeId, addressLine1: dto.addressLine1,
                postalCode: dto.postalCode, lon: dto.lon, lat: dto.lat,
            }, { actorUserId: user.id });
            if (dto.geoNodeId)
                await this.repository.markLocationPrimary(id, location.id, { actorUserId: user.id });
            return { data: location };
        }
        catch (error) {
            if (error instanceof Error && error.message === 'PROPERTY_NOT_FOUND') {
                throw new common_1.NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Property not found' });
            }
            throw error;
        }
    }
};
exports.PropertiesController = PropertiesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_property_dto_1.CreatePropertyDto, Object]),
    __metadata("design:returntype", void 0)
], PropertiesController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/owners'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assign_owner_dto_1.AssignOwnerDto, Object]),
    __metadata("design:returntype", void 0)
], PropertiesController.prototype, "assignOwner", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(':id/location'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PropertiesController.prototype, "addLocation", null);
exports.PropertiesController = PropertiesController = __decorate([
    (0, common_1.Controller)('properties'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    __metadata("design:paramtypes", [create_property_handler_1.CreatePropertyHandler,
        assign_owner_handler_1.AssignOwnerHandler,
        db_1.PropertyRepository])
], PropertiesController);
