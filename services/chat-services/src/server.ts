import { app, server, io } from './app';
import { createAdapter } from '@socket.io/redis-adapter';
import { config } from './config';
import { connectMongo } from './config/mongo';
import { connectRedis, pubClient, subClient } from './config/redis';
import { socketAuthMiddleware } from './middleware/socket.auth';
import { registerSocketHandlers } from './socket/handlers';

// ─── Start ─────────────────────────────────────────────────────────────────────
const start = async (): Promise<void> => {
  try {
    await connectMongo();
    await connectRedis();

    io.adapter(createAdapter(pubClient, subClient));
    console.log('[Socket.IO] Redis adapter attached');

    io.use(socketAuthMiddleware);
    registerSocketHandlers(io);

    server.listen(config.port, () => {
      console.log(`[chat-services] running on port ${config.port} [${config.nodeEnv}]`);
    });

  } catch (err) {
    console.error('[chat-services] failed to start:', err);
    process.exit(1);
  }
};

start();
