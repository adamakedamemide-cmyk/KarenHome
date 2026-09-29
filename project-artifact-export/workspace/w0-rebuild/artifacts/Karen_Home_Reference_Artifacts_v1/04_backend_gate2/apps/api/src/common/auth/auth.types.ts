import type { AuthenticatedUser } from '@platform/contracts';

export const AUTH_USER = Symbol('AUTH_USER');
export type RequestWithAuth = {
  user?: AuthenticatedUser;
  ip: string;
  headers: Record<string, string | string[] | undefined>;
  id?: string;
};
