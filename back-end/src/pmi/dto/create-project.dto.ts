import { IsString, IsNumber, IsDateString, IsOptional, IsArray } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  nombre: string;

  @IsString()
  @IsOptional()
  idCodigo: string;

  @IsNumber()
  presupuestoTotal: number;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsArray()
  @IsOptional()
  hitos: any[];
}