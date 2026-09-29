"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvironment = validateEnvironment;
function validateEnvironment(env) {
    const nodeEnv = String(env.NODE_ENV ?? 'development');
    const databaseUrl = String(env.DATABASE_URL ?? '');
    const jwtSecret = String(env.JWT_SECRET ?? '');
    const port = Number(env.PORT ?? 3000);
    const accessTtl = Number(env.ACCESS_TOKEN_TTL_SECONDS ?? 900);
    const refreshTtl = Number(env.REFRESH_TOKEN_TTL_SECONDS ?? 2592000);
    if (!databaseUrl)
        throw new Error('DATABASE_URL is required');
    if (jwtSecret.length < 43)
        throw new Error('JWT_SECRET must contain at least 43 characters');
    if (!Number.isInteger(port) || port < 1 || port > 65535)
        throw new Error('PORT is invalid');
    if (!Number.isInteger(accessTtl) || accessTtl < 60 || accessTtl > 3600)
        throw new Error('ACCESS_TOKEN_TTL_SECONDS is invalid');
    if (!Number.isInteger(refreshTtl) || refreshTtl < 3600 || refreshTtl > 31536000)
        throw new Error('REFRESH_TOKEN_TTL_SECONDS is invalid');
    if (nodeEnv === 'production' && jwtSecret === 'replace-this-with-at-least-32-random-characters') {
        throw new Error('Default JWT secret cannot be used in production');
    }
    return { ...env, NODE_ENV: nodeEnv };
}
