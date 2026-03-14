import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getMe,
} from '../controllers/auth.controller';
import {
  authenticate,
  authRateLimiter,
  refreshRateLimiter,
} from '../middleware/auth.middleware';
import { verify } from '../controllers/verify.controller';



const router = Router();
router.get('/verify',  verify);
router.post('/verify', verify);
// ─── Public Routes ─────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', authRateLimiter, register);

// POST /api/auth/login
router.post('/login', authRateLimiter, login);

// POST /api/auth/refresh  — reads refresh token from HttpOnly cookie
router.post('/refresh', refreshRateLimiter, refresh);

// ─── Protected Routes ──────────────────────────────────────────────────────────

// POST /api/auth/logout
router.post('/logout', authenticate, logout);

// POST /api/auth/logout-all  — revoke all sessions for this user
router.post('/logout-all', authenticate, logoutAll);

// GET /api/auth/me
router.get('/me', authenticate, getMe);

export default router;