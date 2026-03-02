import { Job } from './job';

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

  // 🚀 CAMPOS DE CONTROL PMI
  objetivos: string[];
  presupuestoTotal: number;
  presupuestoConsumido: number;
  hitos: Milestone[];

  // RELACIONES
  trabajos: Job[];
  trabajadores: any[];
  pmis: any[];

  /**
   * 📜 BITÁCORA ESPECÍFICA DEL PROYECTO
   */
  logs?: any[];
}
