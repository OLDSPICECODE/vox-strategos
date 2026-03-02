import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { UserRole } from '../../shared/models/user-role.enum';
import { tap, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { User } from '../../shared/models/user';
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly API_URL = 'http://localhost:3000/auth'; 

  // Guardamos el objeto completo del usuario
  currentUser = signal<User | null>(null);

  constructor() {
    this.hydrateSession();
  }

  login(email: string, password: string): Observable<User> {
    console.log('📡 Enviando credenciales a Vox Strategos Backend...');
    
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
    // Persistencia en LocalStorage para no perder sesión al refrescar
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
    localStorage.removeItem('user_data'); // Limpieza selectiva
    this.router.navigate(['/login']);
  }

  private handleError(error: HttpErrorResponse) {
    let msg = 'Error desconocido';
    if (error.status === 401) {
      msg = 'Credenciales inválidas. Jurisdicción denegada.';
    } else if (error.status === 404) {
      msg = 'El servidor de Vox Strategos no responde (404).';
    }
    console.error(`[AuthService Error]: ${msg}`, error);
    return throwError(() => new Error(msg));
  }
}