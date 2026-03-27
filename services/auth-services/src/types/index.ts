import type { Request } from 'express';

// ─── User Types ────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
}

export type UserRole = 'user' | 'admin';

// ─── JWT Payload Types ─────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;       // user id
  email: string;
  jti: string; 
  role: UserRole;
  iss: string;
  aud: string;
}

export interface RefreshTokenPayload {
  sub: string;       // user id
  jti: string;       // unique token id (for revocation)
  iss: string;
}

// ─── Express Request Extensions ───────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user?: AccessTokenPayload;
}

// ─── Auth DTOs ─────────────────────────────────────────────────────────────────

export interface RegisterDTO {
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

// ─── API Response Types ────────────────────────────────────────────────────────

export interface ApiResponse<T = void> {
  success: boolean;
  message: string;
  data?: T;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}