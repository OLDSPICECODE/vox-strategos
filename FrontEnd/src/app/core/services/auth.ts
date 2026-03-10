import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { User } from '../../shared/models/user';
// 👇 IMPORTANTE: Importa el environment
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  // 🚀 CAMBIO CLAVE: Usamos la variable del environment en lugar de localhost
  private readonly API_URL = `${environment.apiUrl}/auth`; 

  currentUser = signal<User | null>(null);

  constructor() {
    this.hydrateSession();
  }

  login(email: string, password: string): Observable<User> {
    console.log(`📡 Conectando a Vox Strategos API en: ${this.API_URL}/login`);
    
    return this.http.post<User>(`${this.API_URL}/login`, { email, password }).pipe(
      tap(user => {
        if (user && user.role) {
          this.saveSession(user);
        }
      }),
      catchError(this.handleError)
    );
  }

  private saveSession(user: User) {
    this.currentUser.set(user);
    localStorage.setItem('user_data', JSON.stringify(user));
  }

  private hydrateSession() {
    const savedUser = localStorage.getItem('user_data');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser) as User;
        this.currentUser.set(user);
      } catch (e) {
        localStorage.removeItem('user_data');
      }
    }
  }

  logout() {
    this.currentUser.set(null);
    localStorage.removeItem('user_data');
    this.router.navigate(['/login']);
  }

  private handleError(error: HttpErrorResponse) {
    let msg = 'Error desconocido';
    if (error.status === 0) {
      msg = 'No se pudo conectar con el servidor. Revisa tu conexión o el proxy.';
    } else if (error.status === 401) {
      msg = 'Credenciales inválidas. Jurisdicción denegada.';
    } else if (error.status === 404) {
      msg = 'Ruta no encontrada en el servidor de Vox Strategos.';
    }
    console.error(`[AuthService Error]: ${msg}`, error);
    return throwError(() => new Error(msg));
  }
}