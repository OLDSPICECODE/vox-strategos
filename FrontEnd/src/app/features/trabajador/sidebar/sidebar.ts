import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html'
})
export class SidebarComponent {
  // Inyectamos el servicio para gestionar la sesión del trabajador
  public authService = inject(AuthService);

  // Signal del trabajador logueado (ej: Logis M.)
  user = this.authService.currentUser; 

  /**
   * Ruta estática para el perfil del trabajador.
   * Alineada con la estructura de rutas hijas del dashboard.
   */
  public readonly profileRoute = '/dashboard/trabajador/profile';

  onLogout() {
    this.authService.logout();
  }
}