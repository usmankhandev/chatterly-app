import { Router } from 'express';
import { PostController } from '../controllers/post.controller';
import { AuthMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Applying AuthMiddleware to Protect Post routes

router.post(
  '/create',
  AuthMiddleware.authenticateUser,
  PostController.createPost,
);

export default router;
