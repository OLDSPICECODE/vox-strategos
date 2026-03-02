import { UserRole } from './user-role.enum';

export interface User {
  id: string;
  nombreCompleto: string;
  email: string;
  role: UserRole;
  cargo?: string;
  /** * Campo adicional para el perfil compartido.
   * Permite registrar el contacto directo de los ingenieros en campo.
   */
  telefono?: string; 
  photoUrl?: string;
}