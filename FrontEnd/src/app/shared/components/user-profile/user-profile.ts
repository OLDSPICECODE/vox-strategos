import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../core/services/auth';
import { UserService } from '../../../core/services/user';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './user-profile.html',
  styleUrls: ['./user-profile.css'],
})
export class UserProfileComponent {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private fb = inject(FormBuilder);

  public activeUser = computed(() => this.authService.currentUser());
  public isSaving = signal(false);

  public profileForm: FormGroup = this.fb.group({
    nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
    cargo: ['', [Validators.required]],
    email: [{ value: '', disabled: true }],
    telefono: [''],
  });

  public securityForm: FormGroup = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  constructor() {
    // Sincroniza el formulario cuando el usuario carga
    effect(() => {
      const user = this.activeUser();
      if (user) {
        this.profileForm.patchValue({
          nombreCompleto: user.nombreCompleto,
          cargo: user.cargo,
          email: user.email,
          telefono: user.telefono,
        });
      }
    });
  }

  /**
   * Guarda los cambios de perfil en la base de datos de Vox Strategos.
   */
  public async onSaveProfile() {
    const user = this.activeUser();
    if (this.profileForm.invalid || !user) return;

    this.isSaving.set(true);

    try {
      // Llamada real al servicio para persistir en DB
      const updatedUser = await this.userService.updateProfile(user.id, this.profileForm.value);

      // Opcional: Actualizar el estado global para que el sidebar cambie el nombre al instante
      // this.authService.updateCurrentUserState(updatedUser);

      alert('Perfil actualizado con éxito');
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('No se pudo actualizar el perfil');
    } finally {
      this.isSaving.set(false);
    }
  }

  public async onUpdateSecurity() {
    const user = this.activeUser();
    const { currentPassword, newPassword, confirmPassword } = this.securityForm.value;

    // 1. Validaciones previas de UI
    if (this.securityForm.invalid || !user) return;

    // 2. Validar que la nueva contraseña y la confirmación coincidan
    if (newPassword !== confirmPassword) {
      alert('❌ La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    // 3. Validar que la nueva no sea igual a la actual (opcional pero recomendado)
    if (currentPassword === newPassword) {
      alert('⚠️ La nueva contraseña debe ser diferente a la actual.');
      return;
    }

    try {
      // 4. Enviamos solo lo que el Backend espera (currentPassword y newPassword)
      await this.userService.updatePassword(user.id, { currentPassword, newPassword });

      alert('✅ Contraseña actualizada correctamente en el servidor.');
      this.securityForm.reset();
    } catch (error: any) {
      // Si el backend lanza el UnauthorizedException que configuramos:
      const errorMsg = error.error?.message || 'Error al cambiar contraseña';
      alert(`❌ ${errorMsg}`);
    }
  }
}
