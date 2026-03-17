import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { NotificationController } from '../controllers/notification.controller';

const router = Router();

router.get('/', AuthMiddleware.authenticateUser, NotificationController.list);
router.get(
  '/unread-count',
  AuthMiddleware.authenticateUser,
  NotificationController.getUnreadCount,
);
router.post(
  '/create',
  AuthMiddleware.authenticateUser,
  NotificationController.create,
);
router.patch(
  '/:id/read',
  AuthMiddleware.authenticateUser,
  NotificationController.markAsRead,
);
router.patch(
  '/read-all',
  AuthMiddleware.authenticateUser,
  NotificationController.markAllAsRead,
);
router.delete(
  '/:id',
  AuthMiddleware.authenticateUser,
  NotificationController.delete,
);
router.delete(
  '/delete-all',
  AuthMiddleware.authenticateUser,
  NotificationController.deleteAll,
);

export default router;
