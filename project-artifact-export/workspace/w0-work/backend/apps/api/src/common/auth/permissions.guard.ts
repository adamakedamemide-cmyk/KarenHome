import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { PERMISSIONS_KEY } from './permissions.decorator';
import type { AuthenticatedUser } from '@platform/contracts';
import { IamRepository } from '@platform/db';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly iam: IamRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];
    if (required.length === 0) return true;
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) throw new ForbiddenException({ code: 'AUTH_REQUIRED', message: 'Authentication required' });

    const rawOrg = request.headers['x-organization-id'];
    const organizationId = typeof rawOrg === 'string' ? rawOrg : undefined;
    if (!organizationId) {
      throw new ForbiddenException({ code: 'ORG_SCOPE_REQUIRED', message: 'Organization scope is required' });
    }

    const permissions = await this.iam.listPermissionCodesForUser(user.id, organizationId);
    const allowed = required.every((permission) => permissions.includes(permission));
    if (!allowed) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Required permission is missing' });
    return true;
  }
}
