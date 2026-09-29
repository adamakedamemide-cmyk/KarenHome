"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../../infrastructure/database.module");
const search_module_1 = require("../search/search.module");
const advertising_module_1 = require("../advertising/advertising.module");
const admin_controller_1 = require("./presentation/admin.controller");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, search_module_1.SearchModule, advertising_module_1.AdvertisingModule],
        controllers: [admin_controller_1.AdminController],
        providers: [admin_controller_1.PlatformAdminGuard],
    })
], AdminModule);
