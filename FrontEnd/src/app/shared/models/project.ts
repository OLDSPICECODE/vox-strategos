import { Job } from './job';

// 💸 Agregamos la interfaz de Pago/Movimiento para que TypeScript la reconozca
export interface Pago {
  id?: string;
  monto: number;
  descripcion: string;
  tipo: 'ENTRADA' | 'SALIDA';
  aceptado?: boolean;
  fechaPago?: string | Date;
}

export interface Milestone {
  id?: string;
  nombre: string;
  fecha: string | Date;
  estado: 'COMPLETO' | 'EN_PROCESO' | 'PENDIENTE' | 'completed' | 'in-progress' | 'scheduled';
  descripcion?: string;
}

export interface Project {
  id: string;
  nombre: string;
  idCodigo: string;
  descripcion: string;
  fechaInicio: Date | string;
  fechaFin: Date | string;
  progreso: number;
  estado: string;

  // 🚀 CAMPOS FINANCIEROS (Sincronizados con PostgreSQL)
  presupuestoTotal: number;      
  presupuestoConsumido?: number; 
  movimientos?: Pago[];          

  // 🚀 CAMPOS DE CONTROL PMI
  objetivos: string[];
  hitos: Milestone[];

  // RELACIONES
  trabajos: Job[];
  trabajadores: any[]; 
  pmis: any[];         

  /**s
   * 📜 BITÁCORA ESPECÍFICA DEL PROYECTO
   */
  logs?: any[];
}