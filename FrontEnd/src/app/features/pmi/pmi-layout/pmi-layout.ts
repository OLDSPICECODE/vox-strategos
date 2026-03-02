import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-pmi-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './pmi-layout.html',
  styleUrls: ['./pmi-layout.css']
})
export class PmiLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  public activeUser = computed(() => this.authService.currentUser());
  // Signal para controlar si el sidebar está plegado
  public isCollapsed = signal(false);

  public menuItems = [
    { path: 'overview', icon: 'dashboard', label: 'Dashboard' },
    { path: 'projects', icon: 'account_tree', label: 'Constructor' },
    { path: 'gantt', icon: 'view_timeline', label: 'Gantt' },
    { path: 'budgets', icon: 'monetization_on', label: 'Presupuestos' },
    { path: 'staff', icon: 'badge', label: 'Personal' },
    { path: 'teams', icon: 'group_work', label: 'Equipos' },
    { path: 'users', icon: 'admin_panel_settings', label: 'Usuarios' },
  ];

  toggleSidebar() {
    this.isCollapsed.update(v => !v);
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}