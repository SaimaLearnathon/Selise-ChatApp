import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { connectRedis } from './errorHandlers/utils/redis.utils';
import { globalRateLimiter, errorHandler } from './middleware/auth.middleware';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';

const app = express();

// ─── Security Headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,          // required for cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));       // prevent large payload attacks
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Global Rate Limiter ───────────────────────────────────────────────────────
app.use(globalRateLimiter);

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────────────────
const start = async (): Promise<void> => {
  try {
    await connectRedis();
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();

export default app;