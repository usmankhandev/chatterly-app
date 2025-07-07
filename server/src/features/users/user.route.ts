import { Router } from 'express';
import { UserController } from './user.controller';

const userRouter = Router();

userRouter.post('/', UserController.create);
userRouter.get('/', UserController.getAll);
// router.get('/:id', UserController.getById);
// router.delete('/:id', UserController.delete);

export default userRouter;
