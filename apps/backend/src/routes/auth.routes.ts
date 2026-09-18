import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { loginSchema, changePasswordSchema } from '../validators/auth.validators';
import { authMiddleware } from '../middleware/auth.middleware';
import { loginRateLimit } from '../middleware/rateLimit.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/login', loginRateLimit, validate(loginSchema), asyncHandler(AuthController.login));
router.post('/refresh', asyncHandler(AuthController.refresh));
router.post('/logout', asyncHandler(AuthController.logout));

router.use(authMiddleware);
router.get('/me', asyncHandler(AuthController.getMe));
router.patch('/me/password', validate(changePasswordSchema), asyncHandler(AuthController.changePassword));

export default router;
