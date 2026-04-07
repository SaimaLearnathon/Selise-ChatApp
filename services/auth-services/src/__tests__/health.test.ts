import request from 'supertest';

// Mock express-rate-limit so all rate limiters become pass-through middleware.
// This prevents the LazyRedisStore from ever trying to connect to Redis.
jest.mock('express-rate-limit', () =>
  jest.fn(() => (_req: any, _res: any, next: any) => next())
);

// Mock redis utils so no real Redis connection is attempted anywhere.
jest.mock('../errorHandlers/utils/redis.utils', () => ({
  __esModule: true,
  default: {
    sendCommand: jest.fn().mockResolvedValue(null),
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    isOpen: true,
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  },
  connectRedis: jest.fn().mockResolvedValue(undefined),
  storeRefreshToken: jest.fn().mockResolvedValue(undefined),
  isRefreshTokenValid: jest.fn().mockResolvedValue(true),
  revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
  revokeAllUserRefreshTokens: jest.fn().mockResolvedValue(undefined),
  blockAccessToken: jest.fn().mockResolvedValue(undefined),
  isAccessTokenBlocked: jest.fn().mockResolvedValue(false),
}));

import app from '../app';

describe('Health Check Endpoint', () => {
  it('should return 200 OK and status ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/api/v1/non-existent-route');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('message', 'Route not found');
  });
});
