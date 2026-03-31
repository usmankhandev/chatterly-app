import { SocketEvents } from '../../../constants/socketEvents';

export const NotificationEvents = {
  READ: SocketEvents.NOTIFICATION_READ,
  DELETE: SocketEvents.NOTIFICATION_DELETE,
  NEW: SocketEvents.NOTIFICATION_NEW,
  GET_UNREAD_COUNT: SocketEvents.NOTIFICATION_GET_UNREAD,
  NEW_COMMENT: SocketEvents.POST_NEW_COMMENT,
  NEW_LIKE: SocketEvents.POST_NEW_LIKE,
  GET_LIKE_COUNT: SocketEvents.POST_LIKE_COUNT,
};
