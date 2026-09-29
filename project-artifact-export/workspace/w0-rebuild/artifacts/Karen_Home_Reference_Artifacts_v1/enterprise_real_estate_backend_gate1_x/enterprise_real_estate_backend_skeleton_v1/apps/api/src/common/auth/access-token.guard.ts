import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AccessTokenService } from './access-token.service';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly tokens: AccessTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: unknown }>();
    const raw = request.headers.authorization;
    if (!raw?.startsWith('Bearer ')) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Bearer token required' });
    try {
      const user = await this.tokens.verify(raw.slice(7));
      if (user.status !== 'active') throw new UnauthorizedException({ code: 'USER_NOT_ACTIVE', message: 'User is not active' });
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException({ code: 'INVALID_ACCESS_TOKEN', message: 'Invalid or expired access token' });
    }
  }
}
