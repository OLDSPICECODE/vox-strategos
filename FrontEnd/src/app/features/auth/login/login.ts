import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth'; // Ajusta la ruta
import { UserRole } from '../../../shared/models/user-role.enum';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
})
export class LoginComponent {
  private router = inject(Router);
  private authService = inject(AuthService); // Inyectamos el cerebro de la seguridad

  // Signals para el estado de la UI
  email = signal('');
  password = signal('');
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // Usamos binding bidireccional o métodos de actualización
  updateEmail(event: Event) {
    this.email.set((event.target as HTMLInputElement).value);
  }

  updatePassword(event: Event) {
    this.password.set((event.target as HTMLInputElement).value);
  }

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  onLogin(event: Event) {
    event.preventDefault();
    
    if (!this.email() || !this.password()) {
      this.errorMessage.set('Por favor, completa todos los campos.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Llamamos al servicio (que ahora maneja la persistencia y los Signals)
    this.authService.login(this.email(), this.password()).subscribe({
      next: (res) => {
        if (res && res.role) {
          console.log('Login exitoso. Rol detectado:', res.role);
          this.redirectByUserRole(res.role);
        } else {
          this.errorMessage.set('Error en la autenticación.');
        }
      },
      error: (err) => {
        this.errorMessage.set('Credenciales incorrectas o error de servidor.');
        this.isLoading.set(false);
      },
      complete: () => this.isLoading.set(false)
    });
  }

  private redirectByUserRole(role: UserRole) {
    // Diccionario táctico de rutas basado en el Enum real
    const dashboardRoutes: Record<UserRole, string> = {
      [UserRole.JEFE]: '/dashboard/jefe',
      [UserRole.PMI]: '/dashboard/pmi',
      [UserRole.TRABAJADOR]: '/dashboard/trabajador'
    };

    const target = dashboardRoutes[role] || '/login';
    this.router.navigate([target]);
  }
}