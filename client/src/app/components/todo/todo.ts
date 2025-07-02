import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms'; // For ngModel
import { Todo } from '../../models/todo/todo.model';

import {User} from '../../models/user/user.model'
import { TodoService } from '../../services/todo/todo.service';
import { HttpClientModule } from '@angular/common/http';



 

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './todo.html',
  // styleUrl: './todo.scss'
})


export class TodoComponent {
  todos: Todo[] = [];
  users: User[] = [];
  newTodoTitle: string = ''
  todoForm!: FormGroup;
  loadingTodos: boolean = false;
  loadingUsers: boolean = false;


  constructor(public todoService: TodoService, private fb: FormBuilder) {
    
  } //  Inject the service
  
  
  ngOnInit(): void {
    this.todoForm = this.fb.group({
      userId: [1],
      title: [''],
      description: [''],
      isCompleted: [false]
    });
    
    this.loadTodos();
    this.loadUsers();
  }

  loadUsers(): void {
    this.loadingUsers = true;
    this.todoService.getUsers().subscribe({
      next: (users) => {
        console.log(`Users fetched`, users);
        this.users = users;
        this.loadingUsers = false;
      },
      error: (error) => {
        console.error(`Error fetching users`, error);
        this.loadingUsers = false;
        return;
      },
      complete: () => this.loadingUsers = false
    })
  }

  loadTodos(): void {
    this.loadingTodos = true;
    this.todoService.getTodos().subscribe({
      next: (todos) => {
        console.log(`Todos fetched`, todos);
        this.todos = todos;
        this.loadingTodos = false;
      },
      error: (error) => {
        console.error(`Error fetching todos`, error);
        this.loadingTodos = false;
        return;
      },
      complete: () => this.loadingTodos = false
    });
  }
  
  addTodo(): void {
    if(this.todoForm.valid) {
      const newTodo: Partial<Todo> = this.todoForm.value;
      console.log(`Submitting Todo`, newTodo);

      this.todoService.addTodo(newTodo).subscribe({
        next: (createdTodo) => {
          console.log(`Todo added`, newTodo);
          this.todos.push(createdTodo);
          this.todoForm.reset({userId: 1, isCompleted: false});
          // this.loadTodos();
        },
        error: (error) => {
          console.error(`Error adding todo`, error);
        }
      })
    }
  }

  deleteTodo(id: number): void {
    this.todoService.deleteTodo(id).subscribe(() => this.loadTodos()) 
  }

}
