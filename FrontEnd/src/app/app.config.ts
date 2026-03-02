import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // El nombre correcto en Angular 18/19/20 es este:
    provideZonelessChangeDetection(), 
    provideRouter(routes),
    provideHttpClient()
  ]
};