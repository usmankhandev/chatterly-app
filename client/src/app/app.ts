import { Component } from '@angular/core';
import { TodoComponent } from './components/todo/todo';



// import { RouterOutlet } from '@angular/router';



@Component({
  selector: 'app-root',
  // imports: [RouterOutlet],
  templateUrl: './app.html',
  standalone: true,
  imports: [TodoComponent],
  // styleUrl: './app.scss'

})
export class AppComponent {}
