import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { InvalidCredentialsError, SessionInvalidError, UserAlreadyExistsError } from '../../modules/iam/domain/iam.errors';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const request = host.switchToHttp().getRequest<FastifyRequest>();
    const requestId = String(request.id ?? request.headers['x-request-id'] ?? 'unknown');
    const mapped = mapException(exception);
    response.status(mapped.status).send({ error: { code: mapped.code, message: mapped.message, ...(mapped.details ? { details: mapped.details } : {}), requestId } });
  }
}

function mapException(exception: unknown): { status: number; code: string; message: string; details?: unknown[] } {
  if (exception instanceof UserAlreadyExistsError) return { status: HttpStatus.CONFLICT, code: 'USER_ALREADY_EXISTS', message: exception.message };
  if (exception instanceof InvalidCredentialsError) return { status: HttpStatus.UNAUTHORIZED, code: 'AUTH_INVALID_CREDENTIALS', message: exception.message };
  if (exception instanceof SessionInvalidError) return { status: HttpStatus.UNAUTHORIZED, code: 'AUTH_SESSION_REVOKED', message: exception.message };
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const payload = exception.getResponse();
    if (typeof payload === 'object' && payload && 'message' in payload) {
      const raw = (payload as { message?: unknown }).message;
      const details = Array.isArray(raw) ? raw.map((message) => ({ reason: String(message) })) : undefined;
      return { status, code: String((payload as { code?: unknown }).code ?? codeForStatus(status)), message: Array.isArray(raw) ? 'Validation failed' : String(raw), details };
    }
    return { status, code: codeForStatus(status), message: typeof payload === 'string' ? payload : exception.message };
  }
  return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL_ERROR', message: 'Internal server error' };
}

function codeForStatus(status: number): string {
  if (status === HttpStatus.BAD_REQUEST) return 'VALIDATION_FAILED';
  if (status === HttpStatus.FORBIDDEN) return 'FORBIDDEN';
  if (status === HttpStatus.NOT_FOUND) return 'RESOURCE_NOT_FOUND';
  if (status === HttpStatus.CONFLICT) return 'CONFLICT';
  if (status === HttpStatus.TOO_MANY_REQUESTS) return 'RATE_LIMITED';
  if (status === HttpStatus.UNAUTHORIZED) return 'UNAUTHORIZED';
  return 'HTTP_ERROR';
}
