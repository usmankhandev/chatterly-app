import { TokenUtils } from '../../utils/shared/auth.utils';
import { Socket } from 'socket.io';
import { NextFunction } from 'express';

export function socketAuth(socket: Socket, next: NextFunction) {
  try {
    // Verify JWT token
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    const decoded = TokenUtils.verifyAccessToken(token);
    socket.data.userId = decoded.userId;
    socket.data.email = decoded.email;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
}
