import { LikeController } from '../controllers/like.controller';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { Router } from 'express';

const router = Router();

router.post(
  '/create',
  AuthMiddleware.authenticateUser,
  LikeController.createLike,
);

router.delete(
  '/:likeId',
  AuthMiddleware.authenticateUser,
  LikeController.deleteLike,
);

export default router;
