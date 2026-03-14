import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types';

// ─── User Dashboard (any authenticated user) ──────────────────────────────────

export const getDashboard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  res.status(200).json({
    success: true,
    message: 'Dashboard data',
    data: {
      welcomeMessage: `Welcome, ${req.user?.email}`,
      role: req.user?.role,
    },
  });
};

// ─── Admin Panel (admin only) ──────────────────────────────────────────────────

export const getAdminPanel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  res.status(200).json({
    success: true,
    message: 'Admin panel data',
    data: {
      adminMessage: 'You have admin access',
      userId: req.user?.sub,
    },
  });
};