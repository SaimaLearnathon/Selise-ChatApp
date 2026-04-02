import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { pubClient } from '../config/redis';

/**
 * Defer RedisStore creation until first use.
 * This avoids ClientClosedError because RedisStore v4 constructor
 * attempts to load scripts immediately, which requires a connected client.
 */
class LazyRedisStore {
  private store: InstanceType<typeof RedisStore> | null = null;
  private options: any = null;

  init(options: any): void {
    this.options = options;
  }

  private getStore(): InstanceType<typeof RedisStore> {
    if (!this.store) {
      this.store = new RedisStore({
        sendCommand: (...args: string[]) => pubClient.sendCommand(args),
      });
      if (this.options) this.store.init(this.options);
    }
    return this.store;
  }

  async increment(key: string) { return this.getStore().increment(key); }
  async decrement(key: string) { return this.getStore().decrement(key); }
  async resetKey(key: string) { return this.getStore().resetKey(key); }
  async resetAll() { return (this.getStore() as any).resetAll?.(); }
}

const store = new LazyRedisStore();

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,               // Limit each IP to 100 requests per `window`
  standardHeaders: true,    // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,    // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  store: store as any,
});

