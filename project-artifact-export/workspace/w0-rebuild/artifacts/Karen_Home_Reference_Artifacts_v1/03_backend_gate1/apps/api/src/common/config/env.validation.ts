export function validateEnvironment(env: Record<string, unknown>): Record<string, unknown> {
  const nodeEnv = String(env.NODE_ENV ?? 'development');
  if (nodeEnv === 'production') {
    if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required in production');
    const jwt = String(env.JWT_SECRET ?? '');
    if (jwt.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters in production');
  }
  return env;
}
