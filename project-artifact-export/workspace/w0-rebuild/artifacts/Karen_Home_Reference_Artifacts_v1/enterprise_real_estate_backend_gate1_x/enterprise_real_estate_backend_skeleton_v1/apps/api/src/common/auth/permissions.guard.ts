import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import type { FastifyRequest } from 'fastify';
import type { AuthenticatedUser } from '@platform/contracts';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];
    if (required.length === 0) return true;
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) throw new ForbiddenException({ code: 'AUTH_REQUIRED', message: 'Authentication required' });
    const allowed = required.every((permission) => user.permissions.includes(permission));
    if (!allowed) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Required permission is missing' });
    return true;
  }
}
