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
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const search_service_1 = require("../application/search.service");
const search_query_dto_1 = require("./dto/search-query.dto");
let SearchController = class SearchController {
    searchService;
    constructor(searchService) {
        this.searchService = searchService;
    }
    async search(query) {
        const result = await this.searchService.search({
            q: query.q,
            transactionType: query.transactionType,
            propertyType: query.propertyType,
            priceMin: query.priceMin,
            priceMax: query.priceMax,
            currencyCode: query.currencyCode,
            bbox: parseBbox(query.bbox),
            sort: query.sort ?? 'relevance',
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 24,
        });
        return {
            data: result.hits,
            meta: {
                total: result.total,
                page: query.page ?? 1,
                pageSize: query.pageSize ?? 24,
                facets: result.facets,
                engine: result.engine,
            },
        };
    }
    async health() {
        return { data: await this.searchService.health() };
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, common_1.Get)('listings'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_query_dto_1.ListingSearchQueryDto]),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SearchController.prototype, "health", null);
exports.SearchController = SearchController = __decorate([
    (0, common_1.Controller)('search'),
    __metadata("design:paramtypes", [search_service_1.SearchService])
], SearchController);
function parseBbox(raw) {
    if (!raw)
        return undefined;
    const parts = raw.split(',').map((value) => Number(value));
    if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value)))
        return undefined;
    const [minLon, minLat, maxLon, maxLat] = parts;
    if (minLon === undefined || minLat === undefined || maxLon === undefined || maxLat === undefined)
        return undefined;
    return { minLon, minLat, maxLon, maxLat };
}
