import { userModel } from './user.model';


export const UserService = {
    createUser: async (data: {name: string, email: string, password: string}) => {
        return userModel.create({data});
    },

    getAllUsers: async() => {
        return userModel.findMany();
    },

    getUserById: async(id: string) => {
        return userModel.findUnique({
            where: {id}
        });
    },

    deleteUser: async(id: string) => {
        return userModel.delete({
            where: {id}
        });
    },
    
    updateUser: async(id: string, data: {name?: string, email?: string, password?: string}) => {
        return userModel.update({
            where: {id},
            data,
        });
    },
}