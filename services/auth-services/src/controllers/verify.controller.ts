import type { Request, Response } from 'express';
import { verifyAccessToken } from '../errorHandlers/utils/jwt.utils';    // ← same as auth.middleware.ts
import { isAccessTokenBlocked } from '../errorHandlers/utils/redis.utils'; // ← same as auth.middleware.ts
import type { AccessTokenPayload } from '../types';                        // ← same as auth.middleware.ts

// ─── /api/auth/verify ──────────────────────────────────────────────────────────
//
// Called by nginx-ingress BEFORE every request to protected services
// (chat-service, realtime-service etc.)
//
// Flow:
//   1. Client sends:  Authorization: Bearer <accessToken>
//   2. Ingress calls: GET /api/auth/verify  (forwards Authorization header)
//   3. This handler validates the token:
//        ✅ 200 → sets x-user-id, x-user-email, x-user-role response headers
//                 ingress forwards these as request headers to downstream service
//        ❌ 401 → ingress rejects the request, never reaches chat/realtime service
//
// NOTE: chat-service reads x-user-* headers via trustGateway middleware
//       — it never touches JWT at all.

export const verify = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];

    // Same check as your authenticate middleware in auth.middleware.ts
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authorization header missing or malformed' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Uses your existing verifyAccessToken from errorHandlers/utils/jwt.utils.ts
    const payload: AccessTokenPayload = verifyAccessToken(token);

    // Uses your existing isAccessTokenBlocked from errorHandlers/utils/redis.utils.ts
    // Rejects tokens that were invalidated by logout
    if (payload.jti) {
      const blocked = await isAccessTokenBlocked(payload.jti);
      if (blocked) {
        res.status(401).json({ success: false, message: 'Token has been revoked' });
        return;
      }
    }

    // ── Set forwarded identity headers ────────────────────────────────────────
    // nginx-ingress reads these response headers and injects them as
    // REQUEST headers into the downstream service (chat-service etc.)
    // Configured in ingress.yaml:
    //   nginx.ingress.kubernetes.io/auth-response-headers: "x-user-id,x-user-email,x-user-role"
    res.set({
      'x-user-id':    payload.sub,
      'x-user-email': payload.email,
      'x-user-role':  payload.role,
    });

    // 200 = valid → ingress allows the request through to downstream service
    res.status(200).json({ success: true });

  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Access token expired' });
    } else if (err.name === 'JsonWebTokenError') {
      res.status(401).json({ success: false, message: 'Invalid token' });
    } else {
      res.status(500).json({ success: false, message: 'Verification error' });
    }
  }
};