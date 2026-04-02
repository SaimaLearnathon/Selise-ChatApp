import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";

import { verifyAccessToken } from "../errorHandlers/utils/jwt.utils";
import redisClient, { isAccessTokenBlocked } from "../errorHandlers/utils/redis.utils";
import type { AuthenticatedRequest, UserRole } from "../types";


// ─────────────────────────────────────────────────────────────
// 🔐 Authenticate Middleware
// ─────────────────────────────────────────────────────────────
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Authorization header missing or malformed",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    const payload = verifyAccessToken(token);

    if (payload.jti) {
      const blocked = await isAccessTokenBlocked(payload.jti);
      if (blocked) {
        res.status(401).json({
          success: false,
          message: "Token has been revoked",
        });
        return;
      }
    }

    req.user = payload;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      res.status(401).json({ success: false, message: "Access token expired" });
    } else if (err.name === "JsonWebTokenError") {
      res.status(401).json({ success: false, message: "Invalid token" });
    } else {
      res.status(500).json({ success: false, message: "Authentication error" });
    }
  }
};


// ─────────────────────────────────────────────────────────────
// 🛡️ Authorize Middleware
// ─────────────────────────────────────────────────────────────
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: "Insufficient permissions" });
      return;
    }

    next();
  };
};


// ─────────────────────────────────────────────────────────────
// 🔑 Safe Key Generator
// ─────────────────────────────────────────────────────────────
const getClientKey = (req: Request): string => {
  return (req.body?.email as string) || req.ip || "unknown";
};


// ─────────────────────────────────────────────────────────────
// 🔑 Lazy Redis Store Wrapper
// ─────────────────────────────────────────────────────────────

/**
 * Defer RedisStore creation until first use.
 * This avoids ClientClosedError because RedisStore v4 constructor
 * attempts to load scripts immediately, which requires a connected client.
 * express-rate-limit calls .init() at startup, which we capture.
 */
class LazyRedisStore {
  private store: InstanceType<typeof RedisStore> | null = null;
  private options: any = null;

  constructor(private prefix: string) {}

  init(options: any): void {
    // Capture options (like windowMs) from express-rate-limit
    this.options = options;
  }

  private getStore(): InstanceType<typeof RedisStore> {
    if (!this.store) {
      this.store = new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        prefix: this.prefix,
      });
      // Apply captured options
      if (this.options) this.store.init(this.options);
    }
    return this.store;
  }

  async increment(key: string) { return this.getStore().increment(key); }
  async decrement(key: string) { return this.getStore().decrement(key); }
  async resetKey(key: string) { return this.getStore().resetKey(key); }
  async resetAll() { return (this.getStore() as any).resetAll?.(); }
}

const authStore = new LazyRedisStore("rl:auth:");
const refreshStore = new LazyRedisStore("rl:refresh:");
const globalStore = new LazyRedisStore("rl:global:");




// ─────────────────────────────────────────────────────────────
// 🚫 Rate Limiters
// ─────────────────────────────────────────────────────────────

// 🔐 Auth limiter (login/register)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many login attempts. Try again later.",
  },
  keyGenerator: getClientKey,
  store: authStore as any,
});




// 🔄 Refresh limiter
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many refresh requests",
  },
  keyGenerator: (req: Request): string => req.ip || "unknown",
  store: refreshStore as any,
});




// 🌐 Global limiter
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests",
  },
  keyGenerator: (req: Request): string => req.ip || "unknown",
  store: globalStore as any,
});




// ─────────────────────────────────────────────────────────────
// ❌ Error Handler
// ─────────────────────────────────────────────────────────────
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error(`[Error] ${err.message}`);
  if (err.stack) console.error(err.stack);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};