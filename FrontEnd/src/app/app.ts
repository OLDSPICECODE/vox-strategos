import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  // El RouterOutlet es el portal donde aparecerá tu Login
  template: `<router-outlet></router-outlet>`, 
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Vox Strategos');
}