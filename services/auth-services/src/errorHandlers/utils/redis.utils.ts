import { createClient } from 'redis';
import { config } from '../../config';

const redisClient = createClient({ url: config.redis.url });

redisClient.on('error', (err) => console.error('Redis error:', err));
redisClient.on('connect', () => console.log('Redis connected'));

export const connectRedis = async (): Promise<void> => {
  await redisClient.connect();
};

// ─── Refresh Token Store (whitelist) ──────────────────────────────────────────

// Store jti → userId with TTL matching refresh token expiry (7 days)
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

export const storeRefreshToken = async (jti: string, userId: string): Promise<void> => {
  await redisClient.setEx(`refresh:${jti}`, REFRESH_TTL_SECONDS, userId);
};

export const isRefreshTokenValid = async (jti: string): Promise<boolean> => {
  const value = await redisClient.get(`refresh:${jti}`);
  return value !== null;
};

export const revokeRefreshToken = async (jti: string): Promise<void> => {
  await redisClient.del(`refresh:${jti}`);
};

// Revoke all refresh tokens for a user (e.g., on password change)
export const revokeAllUserRefreshTokens = async (userId: string): Promise<void> => {
  const keys = await redisClient.keys(`refresh:*`);
  for (const key of keys) {
    const val = await redisClient.get(key);
    if (val === userId) await redisClient.del(key);
  }
};

// ─── Access Token Blocklist (for logout before expiry) ────────────────────────

export const blockAccessToken = async (jti: string, ttlSeconds: number): Promise<void> => {
  await redisClient.setEx(`blocklist:${jti}`, ttlSeconds, '1');
};

export const isAccessTokenBlocked = async (jti: string): Promise<boolean> => {
  const value = await redisClient.get(`blocklist:${jti}`);
  return value !== null;
};

export default redisClient;