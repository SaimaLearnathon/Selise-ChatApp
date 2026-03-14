import crypto from 'crypto';

// Validate required environment variables at startup
const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',

  jwt: {
    accessSecret: process.env.ACCESS_TOKEN_SECRET ?? crypto.randomBytes(64).toString('hex'),
    refreshSecret: process.env.REFRESH_TOKEN_SECRET ?? crypto.randomBytes(64).toString('hex'),
    accessExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d',
    issuer: 'auth-project',
    audience: 'auth-project-client',
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },

  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  },

  bcrypt: {
    saltRounds: 12,
  },

  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/api/auth/refresh',
  },
} as const;