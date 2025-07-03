import express from 'express';
import cors from 'cors';
import userRouter from './features/users/user.route';




const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/v1/users/', userRouter);

app.get('/', (req, res) => {
    res.send('✅ Chatterly backend is up');
})

export default app;