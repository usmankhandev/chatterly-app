export interface User {
    id: number,
    name: string,
    role: UserRole
}

export enum UserRole {
    ADMIN = 'ADMIN',
    CUSTOMER = 'CUSTOMER',
    SHOPKEEPER = 'SHOPKEEPER'
}
