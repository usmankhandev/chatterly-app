import { Injectable } from "@angular/core";
import { Todo } from '../../models/todo/todo.model';
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import {User} from '../../models/user/user.model';



@Injectable({
    providedIn: 'root',
})

export class TodoService {

    private apiUrl = 'https://6862b7ee96f0cc4e34bac134.mockapi.io/api/v1/todo';
    private usersUrl = 'https://6862b7ee96f0cc4e34bac134.mockapi.io/api/v1/users';

    constructor(private http: HttpClient) {}


    addTodo(newTodo: Partial<Todo>): Observable<Todo> {
       return this.http.post<Todo>(this.apiUrl, newTodo)
    }

    getTodos(): Observable<Todo[]> {
        return this.http.get<Todo[]>(this.apiUrl);
    }

    deleteTodo(id: Number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`)
    }

    getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.usersUrl);
    }
    
    toggleComplete(id: Number): void {

    }

}

