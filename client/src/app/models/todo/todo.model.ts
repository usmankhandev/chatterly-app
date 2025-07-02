import { User } from '../user/user.model';

export interface Todo {
    id: number, 
    title: string,
    description: string,
    isCompleted: boolean,
    userId: number
}