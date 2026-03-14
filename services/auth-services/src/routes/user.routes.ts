import { Router } from 'express';
import { getDashboard, getAdminPanel } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// GET /api/users/dashboard — any authenticated user
router.get('/dashboard', getDashboard);

// GET /api/users/admin — admin only
router.get('/admin', authorize('admin'), getAdminPanel);

export default router;