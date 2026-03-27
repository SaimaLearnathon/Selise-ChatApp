export const config = {
  port: parseInt(process.env.PORT ?? '4002', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  mongo: {
    url: process.env.MONGO_URL ?? 'mongodb://localhost:27017/chatapp',
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },

  jwt: {
    // Must match auth-service secret exactly
    accessSecret: process.env.ACCESS_TOKEN_SECRET ?? '',
    issuer:       'auth-project',
    audience:     'auth-project-client',
  },

  cors: {
    origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
  },
} as const;