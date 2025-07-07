import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const userRouter = router.get('/', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

export default userRouter;
