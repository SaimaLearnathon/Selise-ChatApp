import { createServer } from 'http';
import express, { Request, Response } from 'express';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { config } from './config';
import { connectMongo } from './config/mongo';
import { connectRedis, pubClient, subClient } from './config/redis';
import { socketAuthMiddleware } from './middleware/socket.auth';
import { globalRateLimiter } from './middleware/rateLimiter';
import { registerSocketHandlers } from './socket/handlers';

const app    = express();
const server = createServer(app);

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
app.use(globalRateLimiter);

// ─── Socket.IO Server ──────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:      config.cors.origin,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'chat-services' });
});

// ─── Chat API Routes ───────────────────────────────────────────────────────────
// Add other API routes here if needed

export { io, app, server };