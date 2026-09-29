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
exports.AttachMediaDto = void 0;
const class_validator_1 = require("class-validator");
class AttachMediaDto {
    mediaAssetId;
    mediaType;
    isCover;
}
exports.AttachMediaDto = AttachMediaDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AttachMediaDto.prototype, "mediaAssetId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['photo', 'video', 'floor_plan', 'virtual_tour', 'document', 'other']),
    __metadata("design:type", String)
], AttachMediaDto.prototype, "mediaType", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AttachMediaDto.prototype, "isCover", void 0);
