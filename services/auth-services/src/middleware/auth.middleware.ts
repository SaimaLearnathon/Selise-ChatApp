import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyAccessToken } from '../errorHandlers/utils/jwt.utils';
import { isAccessTokenBlocked } from '../errorHandlers/utils/redis.utils';
import type { AuthenticatedRequest, UserRole } from '../types';

// ─── Authenticate Middleware ───────────────────────────────────────────────────
// Validates Bearer access token on every protected route

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authorization header missing or malformed' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify signature, expiry, issuer, audience
    const payload = verifyAccessToken(token);

    // Check blocklist (for logged-out tokens still within expiry window)
    if (payload.jti) {
      const blocked = await isAccessTokenBlocked(payload.jti);
      if (blocked) {
        res.status(401).json({ success: false, message: 'Token has been revoked' });
        return;
      }
    }

    req.user = payload;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Access token expired' });
    } else if (err.name === 'JsonWebTokenError') {
      res.status(401).json({ success: false, message: 'Invalid token' });
    } else {
      res.status(500).json({ success: false, message: 'Authentication error' });
    }
  }
};

// ─── Authorize Middleware ──────────────────────────────────────────────────────
// Role-based access control — use after authenticate

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

// ─── Rate Limiters ─────────────────────────────────────────────────────────────

// Strict limiter for login/register — prevent brute force
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later' },
  skipSuccessfulRequests: true, // only count failed requests
});

// Moderate limiter for refresh endpoint
export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many refresh requests' },
});

// General API limiter
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests' },
});

// ─── Error Handler Middleware ──────────────────────────────────────────────────

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error(`[Error] ${err.message}`);
  res.status(500).json({ success: false, message: 'Internal server error' });
};