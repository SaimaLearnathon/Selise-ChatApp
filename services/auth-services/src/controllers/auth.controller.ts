import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../errorHandlers/utils/jwt.utils';
import {
  storeRefreshToken,
  isRefreshTokenValid,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  blockAccessToken,
} from '../errorHandlers/utils/redis.utils';
import {
  validateRegisterInput,
  validateLoginInput,
} from '../errorHandlers/utils/validation.utils';
import type { AuthenticatedRequest, User } from '../types';

// ─── In-Memory User Store (replace with real DB, e.g. Prisma/TypeORM) ─────────

const userStore = new Map<string, User>();

const findUserByEmail = (email: string): User | undefined =>
  [...userStore.values()].find((u) => u.email === email);

// ─── Register ──────────────────────────────────────────────────────────────────

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate input
    const errors = validateRegisterInput(email, password);
    if (errors.length > 0) {
      res.status(400).json({ success: false, message: 'Validation failed', data: errors });
      return;
    }

    // Check duplicate email — use generic message to prevent user enumeration
    if (findUserByEmail(email)) {
      res.status(409).json({ success: false, message: 'Registration failed' });
      return;
    }

    // Hash password with bcrypt (cost factor 12)
    const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);

    const user: User = {
      id: uuidv4(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'user',
      createdAt: new Date(),
    };

    userStore.set(user.id, user);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ success: false, message: 'Registration error' });
  }
};

// ─── Login ─────────────────────────────────────────────────────────────────────

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const errors = validateLoginInput(email, password);
    if (errors.length > 0) {
      res.status(400).json({ success: false, message: 'Validation failed', data: errors });
      return;
    }

    const user = findUserByEmail(email?.toLowerCase?.().trim());

    // Use constant-time comparison even on missing user to prevent timing attacks
    const dummyHash = '$2b$12$invalidhashfortimingnormalization';
    const isValid = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!isValid) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user!.id, user!.email, user!.role);
    const { token: refreshToken, jti } = generateRefreshToken(user!.id);

    // Store refresh token jti in Redis
    await storeRefreshToken(jti, user!.id);

    // Send refresh token as HttpOnly cookie
    res.cookie('refreshToken', refreshToken, config.cookie);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        user: { id: user!.id, email: user!.email, role: user!.role },
      },
    });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ success: false, message: 'Login error' });
  }
};

// ─── Refresh Token ─────────────────────────────────────────────────────────────

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const token: string | undefined = req.cookies?.refreshToken;

    if (!token) {
      res.status(401).json({ success: false, message: 'No refresh token' });
      return;
    }

    // Verify signature and expiry
    const payload = verifyRefreshToken(token);

    // Check whitelist — ensures revoked tokens are rejected
    const isValid = await isRefreshTokenValid(payload.jti);
    if (!isValid) {
      res.status(403).json({ success: false, message: 'Refresh token revoked' });
      return;
    }

    // Get user
    const user = userStore.get(payload.sub);
    if (!user) {
      res.status(403).json({ success: false, message: 'User not found' });
      return;
    }

    // ── Refresh Token Rotation ──────────────────────────────────────────────
    // Revoke old token and issue a brand new one
    await revokeRefreshToken(payload.jti);
    const { token: newRefreshToken, jti: newJti } = generateRefreshToken(user.id);
    await storeRefreshToken(newJti, user.id);

    // Issue new access token
    const newAccessToken = generateAccessToken(user.id, user.email, user.role);

    // Set new refresh cookie
    res.cookie('refreshToken', newRefreshToken, config.cookie);

    res.status(200).json({
      success: true,
      message: 'Token refreshed',
      data: { accessToken: newAccessToken },
    });
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Refresh token expired, please log in again' });
    } else {
      res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }
  }
};

// ─── Logout ────────────────────────────────────────────────────────────────────

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const token: string | undefined = req.cookies?.refreshToken;

    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        await revokeRefreshToken(payload.jti);
      } catch {
        // Token already expired/invalid — still clear cookie
      }
    }

    // Block the current access token until it expires
    if (req.user?.jti) {
      const authHeader = req.headers['authorization'];
      const accessToken = authHeader?.split(' ')[1];
      if (accessToken) {
        const decoded = verifyRefreshToken(accessToken);
        // Calculate remaining TTL (in seconds)
        const ttl = (decoded as any).exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) await blockAccessToken(req.user.jti, ttl);
      }
    }

    // Clear cookie
    res.clearCookie('refreshToken', { path: config.cookie.path });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('[logout]', err);
    res.status(500).json({ success: false, message: 'Logout error' });
  }
};

// ─── Logout All Devices ────────────────────────────────────────────────────────

export const logoutAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    await revokeAllUserRefreshTokens(req.user.sub);
    res.clearCookie('refreshToken', { path: config.cookie.path });

    res.status(200).json({ success: true, message: 'Logged out from all devices' });
  } catch (err) {
    console.error('[logoutAll]', err);
    res.status(500).json({ success: false, message: 'Error logging out' });
  }
};

// ─── Get Current User (Protected) ─────────────────────────────────────────────

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = userStore.get(req.user!.sub);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User fetched',
      data: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching user' });
  }
};