import { Component } from '@angular/core';
import { HomeShellComponent } from './features/home/home-shell.component';

@Component({
  selector: 'app-root',
  imports: [HomeShellComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class App {}

