import { Router } from 'express';
import { FriendshipController } from '../controllers/friendship.controller';
import { AuthMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post(
  '/friendrequest',
  AuthMiddleware.authenticateUser,
  FriendshipController.sendFriendRequest,
);

export default router;
