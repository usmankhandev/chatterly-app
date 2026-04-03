import { config } from 'dotenv-flow';
config({
  node_env: process.env.NODE_ENV || 'development',
  silent: false,
});
import { io, Socket } from 'socket.io-client';
import { TokenUtils } from '../utils/shared/auth.utils.js';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

async function testSocketConnection() {
  const testUserId = 'cmm3slmai0000csmichhbl6cg';
  const testEmail = 'kashaf@example.com';

  const token = TokenUtils.generateAccessToken(testUserId, 0, testEmail);

  try {
    const decoded = TokenUtils.verifyAccessToken(token);
  } catch (error: any) {
    process.exit(1);
  }

  const socket: Socket = io(SERVER_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    setTimeout(() => {
      socket.disconnect();
      process.exit(0);
    }, 500000);
  });

  socket.on('connect_error', (error) => {
    process.exit(1);
  });
  socket.onAny((event, data) => {
    console.log('EVENT:', event, data);
  });
}

testSocketConnection();
