import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { InvalidCredentialsError, SessionInvalidError, UserAlreadyExistsError } from '../../modules/iam/domain/iam.errors';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const request = host.switchToHttp().getRequest<FastifyRequest>();
    const mapped = mapException(exception);
    response.status(mapped.status).send({ error: { code: mapped.code, message: mapped.message, requestId: request.id } });
  }
}

function mapException(exception: unknown): { status: number; code: string; message: string } {
  if (exception instanceof UserAlreadyExistsError) return { status: HttpStatus.CONFLICT, code: 'USER_ALREADY_EXISTS', message: exception.message };
  if (exception instanceof InvalidCredentialsError || exception instanceof SessionInvalidError) return { status: HttpStatus.UNAUTHORIZED, code: 'INVALID_CREDENTIALS', message: exception.message };
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const payload = exception.getResponse();
    const message = typeof payload === 'string' ? payload : typeof payload === 'object' && payload && 'message' in payload ? String((payload as { message?: unknown }).message) : exception.message;
    return { status, code: status === HttpStatus.FORBIDDEN ? 'FORBIDDEN' : status === HttpStatus.UNAUTHORIZED ? 'UNAUTHORIZED' : 'HTTP_ERROR', message };
  }
  return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL_ERROR', message: 'Internal server error' };
}
