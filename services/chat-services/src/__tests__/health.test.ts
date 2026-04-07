import request from 'supertest';

// Mock express-rate-limit so all rate limiters become pass-through middleware.
// This prevents the LazyRedisStore from ever trying to connect to Redis.
jest.mock('express-rate-limit', () =>
  jest.fn(() => (_req: any, _res: any, next: any) => next())
);

// Mock Redis config to prevent connection attempts during tests
jest.mock('../config/redis', () => ({
  pubClient: {
    sendCommand: jest.fn().mockResolvedValue(null),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    duplicate: jest.fn().mockReturnThis(),
  },
  subClient: {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
  },
  connectRedis: jest.fn().mockResolvedValue(undefined),
}));

import { app } from '../app';

describe('Chat Service Health Check', () => {
  it('should return 200 OK and service name', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'chat-services');
  });
});
