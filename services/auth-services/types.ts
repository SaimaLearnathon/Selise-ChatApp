import type { Request } from 'express';

export type UserRole = 'user' | 'admin' | 'moderator';

// ─── JWT Access Token Payload ──────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;      // user id
  email: string;
  role: UserRole;
  jti: string;      // unique token id (for revocation)
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

// ─── Forwarded Identity (set by Auth Service / Ingress after verification) ─────
// Chat Service and Realtime Service read these headers — they never touch JWT

export interface ForwardedIdentity {
  userId: string;
  email: string;
  role: UserRole;
  requestId: string;  // distributed tracing
}

// ─── Extended Express Request ──────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user?: ForwardedIdentity;
  requestId?: string;
}

// ─── Socket Auth ───────────────────────────────────────────────────────────────

export interface SocketAuthPayload {
  userId: string;
  email: string;
  role: UserRole;
}