import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AccessTokenService } from './access-token.service';
import { IamRepository } from '@platform/db';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly tokens: AccessTokenService, private readonly iam: IamRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: { id: string; status: string } }>();
    const raw = request.headers.authorization;
    if (!raw?.startsWith('Bearer ')) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Bearer token required' });
    try {
      const tokenUser = await this.tokens.verify(raw.slice(7));
      const currentUser = await this.iam.findUserById(tokenUser.id);
      if (!currentUser || currentUser.status !== 'active') throw new UnauthorizedException({ code: 'AUTH_SESSION_REVOKED', message: 'User session is no longer active' });
      request.user = { id: currentUser.id, status: currentUser.status };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException({ code: 'INVALID_ACCESS_TOKEN', message: 'Invalid or expired access token' });
    }
  }
}
