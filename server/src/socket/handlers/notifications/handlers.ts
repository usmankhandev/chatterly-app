import { Server, Socket } from 'socket.io';
import { SocketEvents } from '../../../constants/socketEvents';

export function registerNotificationHandlers(socket: Socket, io: Server) {
  socket.on(SocketEvents.NOTIFICATION_READ, (notificationId) => {
    notificationEmitter.broadcastRead(socket.data.userId, notificationId);
  });
}
