// src/app/core/services/user.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { User } from '../../shared/models/user'; // Ajusta la ruta a tu modelo centralizado
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  /**
   * 🛠️ CORRECCIÓN DE RUTA (Singular):
   * Se cambió de '/users' a '/user' para sincronizarse con el @Controller('user') de NestJS.
   * Esto soluciona el error 404 Not Found.
   */
  private apiUrl = `${environment.apiUrl}/user`; 

  /**
   * Actualiza los datos de perfil (nombre, cargo, teléfono) en la base de datos.
   * @param id UUID del usuario (ej: 0d8d45f7...)
   * @param data Campos parciales del usuario
   */
  updateProfile(id: string, data: Partial<User>) {
    // La URL generada será: http://localhost:3000/user/{id}
    return firstValueFrom(this.http.patch<User>(`${this.apiUrl}/${id}`, data));
  }

  /**
   * Envía la solicitud para cambiar la contraseña de seguridad.
   * @param id UUID del usuario
   * @param passwords Objeto con currentPassword y newPassword
   */
  updatePassword(id: string, passwords: any) {
    // El endpoint en el backend debe ser POST /user/{id}/change-password
    return firstValueFrom(this.http.post(`${this.apiUrl}/${id}/change-password`, passwords));
  }
}