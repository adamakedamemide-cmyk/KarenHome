export const API_VERSION = 'v1' as const;

export type UserStatus = 'pending' | 'active' | 'suspended' | 'blocked' | 'deleted';

export type AuthenticatedUser = {
  id: string;
  status: UserStatus;
  permissions: string[];
};

export type AuthTokens = {
  tokenType: 'Bearer';
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
