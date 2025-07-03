import { Request, Response } from 'express';
import { UserService } from './user.service';

export const UserController = {
    create: async (req: Request, res: Response) => {
        const user = await UserService.createUser(req.body);
        res.status(201).json(user);
    },

    getAll: async(req: Request, res: Response) => {
        const users = await UserService.getAllUsers();
        res.status(200).json(users);
    },

    getById: async(req: Request, res: Response) => {
        const {id} = req.params;
        const user = await UserService.getUserById(id);
        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }
        res.status(200).json(user);
    },

    delete: async(req: Request, res: Response) => {
        const {id} = req.params;
        const user = await UserService.deleteUser(id);
        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }
        res.status(204).send();
    },
}