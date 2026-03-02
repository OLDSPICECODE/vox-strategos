import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';

/**
 * DTO para la actualización de perfiles en Vox Strategos.
 * Define las reglas de validación para los datos que recibimos del frontend.
 */
export class UpdateUserDto {
  
  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  nombreCompleto?: string;

  @IsEmail({}, { message: 'El formato del correo electrónico no es válido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  cargo?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;
}