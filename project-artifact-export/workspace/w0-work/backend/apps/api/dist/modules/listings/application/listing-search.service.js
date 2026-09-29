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
exports.ListingSearchService = void 0;
const common_1 = require("@nestjs/common");
const search_service_1 = require("../../search/application/search.service");
/** Thin delegation so GET /listings rides the same engines as /search/listings. */
let ListingSearchService = class ListingSearchService {
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
};
exports.ListingSearchService = ListingSearchService;
exports.ListingSearchService = ListingSearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [search_service_1.SearchService])
], ListingSearchService);
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
