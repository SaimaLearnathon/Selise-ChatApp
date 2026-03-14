import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import type { AccessTokenPayload, RefreshTokenPayload, UserRole } from '../../types';

// ─── Generate Access Token (short-lived, 15min) ────────────────────────────────

export const generateAccessToken = (
  userId: string,
  email: string,
  role: UserRole
): string => {
  const payload: Omit<AccessTokenPayload, 'iss' | 'aud'> = {
    sub: userId,
    email,
    role,
  };

  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
    algorithm: 'HS256',
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
};

// ─── Generate Refresh Token (long-lived, 7d, with unique jti) ─────────────────

export const generateRefreshToken = (userId: string): { token: string; jti: string } => {
  const jti = uuidv4(); // unique ID used for revocation

  const payload: Omit<RefreshTokenPayload, 'iss'> = {
    sub: userId,
    jti,
  };

  const token = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
    algorithm: 'HS256',
    issuer: config.jwt.issuer,
  });

  return { token, jti };
};

// ─── Verify Access Token ───────────────────────────────────────────────────────

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, config.jwt.accessSecret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    algorithms: ['HS256'],
  }) as AccessTokenPayload;
};

// ─── Verify Refresh Token ──────────────────────────────────────────────────────

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, config.jwt.refreshSecret, {
    issuer: config.jwt.issuer,
    algorithms: ['HS256'],
  }) as RefreshTokenPayload;
};

// ─── Decode Without Verification (e.g., for logging expired tokens) ────────────

export const decodeToken = (token: string): jwt.JwtPayload | null => {
  return jwt.decode(token) as jwt.JwtPayload | null;
};