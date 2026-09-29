"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvertisingModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../../infrastructure/database.module");
const ads_controller_1 = require("./presentation/ads.controller");
const advertising_service_1 = require("./application/advertising.service");
const advertising_admin_service_1 = require("./application/advertising-admin.service");
let AdvertisingModule = class AdvertisingModule {
};
exports.AdvertisingModule = AdvertisingModule;
exports.AdvertisingModule = AdvertisingModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule],
        controllers: [ads_controller_1.AdsController, ads_controller_1.AdvertisingAdminController],
        providers: [advertising_service_1.AdvertisingService, advertising_admin_service_1.AdvertisingAdminService],
        exports: [advertising_service_1.AdvertisingService],
    })
], AdvertisingModule);
