import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import userRouter from './features/users/user.route';
import authRouter from './routes/auth.route';

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// routes:

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users/', userRouter);

app.get('/', (req, res) => {
  res.send('✅ Chatterly backend is up');
});

export default app;
