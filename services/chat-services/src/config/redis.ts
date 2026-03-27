import { createClient } from 'redis';
import { config } from './index';

// Two clients needed for Socket.IO Redis adapter
// One publishes, one subscribes — they can't share the same connection
export const pubClient = createClient({ url: config.redis.url });
export const subClient = pubClient.duplicate();

pubClient.on('error', (err) => console.error('[Redis pub] error:', err));
subClient.on('error', (err) => console.error('[Redis sub] error:', err));

export const connectRedis = async (): Promise<void> => {
  await Promise.all([pubClient.connect(), subClient.connect()]);
  console.log('[Redis] connected');
};