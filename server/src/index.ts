import express from 'express';
import cors from 'cors';
import userRouter from './routes/user.route';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// routes;

app.get('/', (req, res) => {
  res.send('✅ Chatterly backend is up');
});

app.use('/users', userRouter);

// listening to the server.

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
