import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthMiddleware } from '../middlewares/auth.middleware';
const router = Router();
router.use(AuthMiddleware.securityHeaders);

router.post('/register', AuthController.register);
router.get('/verify-email', AuthController.verifyEmail);
router.post(
  '/resend-verification-email',
  AuthController.resendVerificationEmail,
);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/reset-password', AuthController.resetPassword);

export default router;
