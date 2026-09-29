"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertiesModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../../infrastructure/database.module");
const properties_controller_1 = require("./presentation/properties.controller");
const create_property_handler_1 = require("./application/create-property.handler");
const assign_owner_handler_1 = require("./application/assign-owner.handler");
let PropertiesModule = class PropertiesModule {
};
exports.PropertiesModule = PropertiesModule;
exports.PropertiesModule = PropertiesModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule],
        controllers: [properties_controller_1.PropertiesController],
        providers: [create_property_handler_1.CreatePropertyHandler, assign_owner_handler_1.AssignOwnerHandler],
    })
], PropertiesModule);
