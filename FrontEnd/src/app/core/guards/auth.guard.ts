// src/app/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth'; 
import { UserRole } from '../../shared/models/user-role.enum';

export const authGuard = (requiredRoles: UserRole[]): CanActivateFn => {
  return () => {
    const router = inject(Router);
    const authService = inject(AuthService);
    
    // 1. Intentamos obtener del Signal
    let user = authService.currentUser();

    // 2. REFUERZO CRÍTICO: Si el Signal está vacío, leemos LocalStorage
    // Esto evita el rebote al login durante la navegación o el refresh.
    if (!user) {
      const savedUser = localStorage.getItem('user_data');
      if (savedUser) {
        try {
          user = JSON.parse(savedUser);
          // Sincronizamos el Signal para que el resto de la app lo tenga
          authService.currentUser.set(user);
        } catch (e) {
          localStorage.removeItem('user_data');
        }
      }
    }

    // 3. Verificación final de jurisdicción
    if (user && requiredRoles.includes(user.role)) {
      return true;
    }

    // 4. Si fallan ambos, al login
    console.warn('Acceso denegado: Rebotando a login por falta de sesión o rol.');
    return router.createUrlTree(['/login']);
  };
};