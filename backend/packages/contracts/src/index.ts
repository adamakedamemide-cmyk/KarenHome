export * from './errors';

export const API_VERSION = 'v1' as const;

export type UserStatus = 'pending' | 'active' | 'suspended' | 'blocked' | 'deleted';

export type AuthenticatedUser = {
  id: string;
  status: UserStatus;
};

export type AuthTokens = {
  tokenType: 'Bearer';
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

export interface ApiErrorDetail {
  field?: string;
  reason: string;
  value?: unknown;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    requestId: string;
  };
}
