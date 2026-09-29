import { ForbiddenException, Injectable } from '@nestjs/common';
import { IamRepository } from '@platform/db';
import type { AuthenticatedUser } from '@platform/contracts';

/**
 * Platform-admin gate for billing plan administration (§14).
 * Resolution rides the 0030 effective-permission engine: organization roles
 * AND personal-scope grants are both honored.
 */
@Injectable()
export class BillingAdminGuard {
  constructor(private readonly iam: IamRepository) {}

  async requirePlatformAdmin(actor: AuthenticatedUser, organizationId?: string): Promise<void> {
    const permissions = await this.iam.listPermissionCodesForUser(actor.id, organizationId);
    if (!permissions.includes('platform.admin')) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Platform admin permission is required' });
    }
  }
}
