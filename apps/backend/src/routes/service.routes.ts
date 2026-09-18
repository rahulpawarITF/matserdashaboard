import { Router } from 'express';
import { ServiceController } from '../controllers/service.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createServiceSchema, updateServiceSchema } from '../validators/service.validators';
import { auditLog } from '../middleware/auditLogger.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler(ServiceController.getServices));
router.post('/', auditLog('service.create', 'service'), validate(createServiceSchema), asyncHandler(ServiceController.createService));

router.get('/:id', asyncHandler(ServiceController.getService));
router.patch('/:id', auditLog('service.update', 'service'), validate(updateServiceSchema), asyncHandler(ServiceController.updateService));
router.delete('/:id', auditLog('service.delete', 'service'), asyncHandler(ServiceController.deleteService));

router.post('/:id/check', auditLog('service.check', 'service'), asyncHandler(ServiceController.triggerManualCheck));
router.get('/:id/results', asyncHandler(ServiceController.getServiceResults));

export default router;
