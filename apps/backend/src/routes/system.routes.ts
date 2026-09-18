import { Router } from 'express';
import { SystemController } from '../controllers/system.controller';
import { authMiddleware } from '../middleware/auth.middleware';

import { auditLog } from '../middleware/auditLogger.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/health',                    SystemController.getHealth);
router.get('/settings',                  SystemController.getSettings);
router.patch('/settings',                auditLog('system.settings.update', 'system'), SystemController.updateSettings);
router.get('/export-report',             SystemController.exportReport);

export default router;
