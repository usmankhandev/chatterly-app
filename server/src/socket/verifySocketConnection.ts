import { config } from 'dotenv-flow';

// Load .env files
config({
  node_env: process.env.NODE_ENV || 'development',
  silent: false,
});

console.log('🔧 Environment Configuration:');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('   JWT_ACCESS_SECRET loaded:', !!process.env.JWT_ACCESS_SECRET);
console.log(
  '   JWT_ACCESS_SECRET preview:',
  process.env.JWT_ACCESS_SECRET?.substring(0, 20) + '...',
);
console.log('');

import { io, Socket } from 'socket.io-client';
import { TokenUtils } from '../utils/shared/auth.utils.js';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

async function testSocketConnection() {
  console.log('🔌 Starting Socket.io Connection Test\n');
  console.log('📍 Server URL:', SERVER_URL);

  const testUserId = 'cmm3slmai0000csmichhbl6cg';
  const testEmail = 'kashaf@example.com';

  console.log('👤 Test User ID:', testUserId);
  console.log('📧 Test Email:', testEmail);

  // ✅ ADD: Check if JWT_ACCESS_SECRET is loaded
  console.log('🔑 JWT_ACCESS_SECRET exists:', !!process.env.JWT_ACCESS_SECRET);
  console.log(
    '🔑 JWT_ACCESS_SECRET length:',
    process.env.JWT_ACCESS_SECRET?.length,
  );

  const token = TokenUtils.generateAccessToken(testUserId, 0, testEmail);
  console.log('🔑 Generated Token (full):', token);
  console.log('');

  // ✅ ADD: Try to verify the token immediately
  try {
    const decoded = TokenUtils.verifyAccessToken(token);
    console.log('✅ Token verification successful!');
    console.log('   Decoded:', decoded);
  } catch (error: any) {
    console.error('❌ Token verification failed:', error.message);
    console.error('   This token will be rejected by server!');
    process.exit(1);
  }

  const socket: Socket = io(SERVER_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('\n✅ CONNECTED TO SERVER!');
    console.log('   Socket ID:', socket.id);

    setTimeout(() => {
      console.log('\n⏱️  Test complete. Disconnecting...');
      socket.disconnect();
      process.exit(0);
    }, 500000);
  });

  socket.on('connect_error', (error) => {
    console.error('\n❌ CONNECTION ERROR:', error.message);
    console.error('   Full error:', error);
    process.exit(1);
  });
}

testSocketConnection();
