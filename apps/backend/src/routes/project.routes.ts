import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validators';
import { auditLog } from '../middleware/auditLogger.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler(ProjectController.getProjects));
router.post('/', auditLog('project.create', 'project'), validate(createProjectSchema), asyncHandler(ProjectController.createProject));

// Live Domain Diagnostic Audit endpoint
router.post('/live-status-audit', asyncHandler(ProjectController.liveStatusAudit));
router.get('/live-status-audit', asyncHandler(ProjectController.liveStatusAudit));

router.get('/:id', asyncHandler(ProjectController.getProject));
router.patch('/:id', auditLog('project.update', 'project'), validate(updateProjectSchema), asyncHandler(ProjectController.updateProject));
router.delete('/:id', auditLog('project.delete', 'project'), asyncHandler(ProjectController.deleteProject));

router.post('/:id/check', auditLog('project.check', 'project'), asyncHandler(ProjectController.triggerManualCheck));
router.get('/:id/results', asyncHandler(ProjectController.getProjectResults));
router.get('/:id/uptime', asyncHandler(ProjectController.getProjectUptime));
router.get('/:id/incidents', asyncHandler(ProjectController.getProjectIncidents));

export default router;
