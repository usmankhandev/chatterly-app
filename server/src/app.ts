import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.route';
import postRouter from './routes/post.route';
import commentRouter from './routes/comment.route';
import 'dotenv-flow/config';
import { sockerServer } from './socket/socket.server';

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

const httpServer = http.createServer(app);

// Initialize Socket.io server
sockerServer.initialize(httpServer);

// routes:

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/posts', postRouter);
app.use('/api/v1/comments', commentRouter);
app.use('/api/v1/notifications', commentRouter); // Placeholder for notifications route

app.get('/', (req, res) => {
  res.send('✅ Chatterly backend is up');
});

export default app;
