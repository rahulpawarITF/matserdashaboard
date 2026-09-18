import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.get('/summary', asyncHandler(DashboardController.getSummary));
router.get('/incidents/recent', asyncHandler(DashboardController.getRecentIncidents));
router.get('/recent-checks', asyncHandler(DashboardController.getRecentChecks));
router.get('/outage-correlation', asyncHandler(DashboardController.getOutageCorrelation));

export default router;
