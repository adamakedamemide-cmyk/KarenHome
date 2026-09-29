"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const contracts_1 = require("@platform/contracts");
const iam_errors_1 = require("../../modules/iam/domain/iam.errors");
const error_catalog_1 = require("../i18n/error-catalog");
/**
 * Gate 4 §18 — code-based error model. Every error response is
 * `{ error: { code, message, details?, requestId } }` where `message` is
 * resolved from the localization catalog (Accept-Language → en fallback).
 */
let ApiExceptionFilter = class ApiExceptionFilter {
    catch(exception, host) {
        const response = host.switchToHttp().getResponse();
        const request = host.switchToHttp().getRequest();
        const requestId = String(request.id ?? request.headers['x-request-id'] ?? 'unknown');
        const acceptLanguage = request.headers['accept-language'];
        const locale = typeof acceptLanguage === 'string' ? acceptLanguage.slice(0, 10) : 'en';
        const mapped = mapException(exception, locale);
        response
            .status(mapped.status)
            .send({ error: { code: mapped.code, message: mapped.message, ...(mapped.details ? { details: mapped.details } : {}), requestId } });
    }
};
exports.ApiExceptionFilter = ApiExceptionFilter;
exports.ApiExceptionFilter = ApiExceptionFilter = __decorate([
    (0, common_1.Catch)()
], ApiExceptionFilter);
function mapException(exception, locale) {
    if ((0, contracts_1.isDomainError)(exception)) {
        const localized = (0, error_catalog_1.localizeErrorCode)(exception.code, locale) ?? exception.message;
        return {
            status: exception.status,
            code: exception.code,
            message: localized,
            ...(exception.details ? { details: exception.details } : {}),
        };
    }
    if (exception instanceof iam_errors_1.UserAlreadyExistsError)
        return { status: common_1.HttpStatus.CONFLICT, code: 'CONFLICT', message: exception.message };
    if (exception instanceof iam_errors_1.InvalidCredentialsError)
        return { status: common_1.HttpStatus.UNAUTHORIZED, code: 'AUTH_INVALID_CREDENTIALS', message: exception.message };
    if (exception instanceof iam_errors_1.SessionInvalidError)
        return { status: common_1.HttpStatus.UNAUTHORIZED, code: 'AUTH_SESSION_REVOKED', message: exception.message };
    if (exception instanceof common_1.HttpException) {
        const status = exception.getStatus();
        const payload = exception.getResponse();
        if (typeof payload === 'object' && payload && 'message' in payload) {
            const raw = payload.message;
            const code = String(payload.code ?? codeForStatus(status));
            const rawDetails = payload.details;
            const details = Array.isArray(raw)
                ? raw.map((message) => ({ reason: String(message) }))
                : Array.isArray(rawDetails)
                    ? rawDetails
                    : undefined;
            return {
                status,
                code,
                message: Array.isArray(raw) ? (0, error_catalog_1.localizeErrorCode)(code, locale) ?? 'Validation failed' : String(raw),
                ...(details !== undefined ? { details } : {}),
            };
        }
        return { status, code: codeForStatus(status), message: typeof payload === 'string' ? payload : exception.message };
    }
    return { status: common_1.HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL_ERROR', message: (0, error_catalog_1.localizeErrorCode)('INTERNAL_ERROR', locale) ?? 'Internal server error' };
}
function codeForStatus(status) {
    if (status === common_1.HttpStatus.BAD_REQUEST)
        return 'VALIDATION_ERROR';
    if (status === common_1.HttpStatus.FORBIDDEN)
        return 'FORBIDDEN';
    if (status === common_1.HttpStatus.NOT_FOUND)
        return 'RESOURCE_NOT_FOUND';
    if (status === common_1.HttpStatus.CONFLICT)
        return 'CONFLICT';
    if (status === common_1.HttpStatus.TOO_MANY_REQUESTS)
        return 'RATE_LIMITED';
    if (status === common_1.HttpStatus.UNAUTHORIZED)
        return 'UNAUTHORIZED';
    if (status === 413)
        return 'MEDIA_TOO_LARGE';
    if (status === 415)
        return 'MEDIA_UNSUPPORTED_TYPE';
    if (status === 422)
        return 'VALIDATION_ERROR';
    if (status === 503)
        return 'DEPENDENCY_UNAVAILABLE';
    return 'HTTP_ERROR';
}
