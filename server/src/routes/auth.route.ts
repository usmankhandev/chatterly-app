import { Router } from 'express';
import { AuthController } from '../features/auth/auth.controller';

const router = new Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

export default router;
