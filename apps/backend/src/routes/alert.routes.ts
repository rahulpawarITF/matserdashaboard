import { Router } from 'express';
import { AlertController } from '../controllers/alert.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createAlertRuleSchema, updateAlertRuleSchema, muteAlertRuleSchema } from '../validators/alert.validators';
import { auditLog } from '../middleware/auditLogger.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler(AlertController.getRules));
router.post('/', auditLog('alert.create', 'alert'), validate(createAlertRuleSchema), asyncHandler(AlertController.createRule));

router.patch('/:id', auditLog('alert.update', 'alert'), validate(updateAlertRuleSchema), asyncHandler(AlertController.updateRule));
router.delete('/:id', auditLog('alert.delete', 'alert'), asyncHandler(AlertController.deleteRule));

router.post('/:id/mute', auditLog('alert.mute', 'alert'), validate(muteAlertRuleSchema), asyncHandler(AlertController.muteRule));
router.get('/:id/logs', asyncHandler(AlertController.getRuleLogs));

export default router;
