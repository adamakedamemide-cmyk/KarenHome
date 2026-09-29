"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingsModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../../infrastructure/database.module");
const search_module_1 = require("../search/search.module");
const listings_controller_1 = require("./presentation/listings.controller");
const listing_service_1 = require("./application/listing.service");
const listing_search_service_1 = require("./application/listing-search.service");
let ListingsModule = class ListingsModule {
};
exports.ListingsModule = ListingsModule;
exports.ListingsModule = ListingsModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, search_module_1.SearchModule],
        controllers: [listings_controller_1.ListingsController],
        providers: [listing_service_1.ListingService, listing_search_service_1.ListingSearchService],
    })
], ListingsModule);
