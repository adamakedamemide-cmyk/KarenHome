import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { isDomainError } from '@platform/contracts';
import { InvalidCredentialsError, SessionInvalidError, UserAlreadyExistsError } from '../../modules/iam/domain/iam.errors';
import { localizeErrorCode } from '../i18n/error-catalog';

/**
 * Gate 4 §18 — code-based error model. Every error response is
 * `{ error: { code, message, details?, requestId } }` where `message` is
 * resolved from the localization catalog (Accept-Language → en fallback).
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const request = host.switchToHttp().getRequest<FastifyRequest>();
    const requestId = String(request.id ?? request.headers['x-request-id'] ?? 'unknown');
    const acceptLanguage = request.headers['accept-language'];
    const locale = typeof acceptLanguage === 'string' ? acceptLanguage.slice(0, 10) : 'en';
    const mapped = mapException(exception, locale);
    response
      .status(mapped.status)
      .send({ error: { code: mapped.code, message: mapped.message, ...(mapped.details ? { details: mapped.details } : {}), requestId } });
  }
}

interface MappedError {
  status: number;
  code: string;
  message: string;
  details?: unknown[];
}

function mapException(exception: unknown, locale: string): MappedError {
  if (isDomainError(exception)) {
    const localized = localizeErrorCode(exception.code, locale) ?? exception.message;
    return {
      status: exception.status,
      code: exception.code,
      message: localized,
      ...(exception.details ? { details: exception.details } : {}),
    };
  }
  if (exception instanceof UserAlreadyExistsError) return { status: HttpStatus.CONFLICT, code: 'CONFLICT', message: exception.message };
  if (exception instanceof InvalidCredentialsError) return { status: HttpStatus.UNAUTHORIZED, code: 'AUTH_INVALID_CREDENTIALS', message: exception.message };
  if (exception instanceof SessionInvalidError) return { status: HttpStatus.UNAUTHORIZED, code: 'AUTH_SESSION_REVOKED', message: exception.message };
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const payload = exception.getResponse();
    if (typeof payload === 'object' && payload && 'message' in payload) {
      const raw = (payload as { message?: unknown }).message;
      const code = String((payload as { code?: unknown }).code ?? codeForStatus(status));
      const rawDetails = (payload as { details?: unknown }).details;
      const details = Array.isArray(raw)
        ? raw.map((message) => ({ reason: String(message) }))
        : Array.isArray(rawDetails)
          ? (rawDetails as unknown[])
          : undefined;
      return {
        status,
        code,
        message: Array.isArray(raw) ? localizeErrorCode(code, locale) ?? 'Validation failed' : String(raw),
        ...(details !== undefined ? { details } : {}),
      };
    }
    return { status, code: codeForStatus(status), message: typeof payload === 'string' ? payload : exception.message };
  }
  return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL_ERROR', message: localizeErrorCode('INTERNAL_ERROR', locale) ?? 'Internal server error' };
}

function codeForStatus(status: number): string {
  if (status === HttpStatus.BAD_REQUEST) return 'VALIDATION_ERROR';
  if (status === HttpStatus.FORBIDDEN) return 'FORBIDDEN';
  if (status === HttpStatus.NOT_FOUND) return 'RESOURCE_NOT_FOUND';
  if (status === HttpStatus.CONFLICT) return 'CONFLICT';
  if (status === HttpStatus.TOO_MANY_REQUESTS) return 'RATE_LIMITED';
  if (status === HttpStatus.UNAUTHORIZED) return 'UNAUTHORIZED';
  if (status === 413) return 'MEDIA_TOO_LARGE';
  if (status === 415) return 'MEDIA_UNSUPPORTED_TYPE';
  if (status === 422) return 'VALIDATION_ERROR';
  if (status === 503) return 'DEPENDENCY_UNAVAILABLE';
  return 'HTTP_ERROR';
}
