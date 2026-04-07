import app from './app';
import { config } from './config';
import { connectRedis } from './errorHandlers/utils/redis.utils';

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
