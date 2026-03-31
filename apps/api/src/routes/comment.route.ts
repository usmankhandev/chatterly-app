import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { CommentController } from '../controllers/comment.controller';

const router = Router();

// Applying AuthMiddleware to Protect comment routes

router.post(
  '/create',
  AuthMiddleware.authenticateUser,
  CommentController.createComment,
);

router.get(
  '/:postId/comments',
  AuthMiddleware.authenticateUser,
  CommentController.getComments,
);

router.delete(
  '/:commentId',
  AuthMiddleware.authenticateUser,
  CommentController.deleteComment,
);

export default router;
