import { User } from './user';
import { Project } from './project';

export enum JobStatus {
  PENDING = 'pending', // Añadido para coincidir con tu lógica de botones
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  REVIEWING = 'Reviewing', // Añadido para coincidir con tu lógica de botones
  DONE = 'Done',
}

export enum JobPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent',
}

// 📂 Nueva interfaz para manejar archivos y links de Drive
export interface JobAttachment {
  id?: string;
  nombre: string;
  url: string;
  tipo: 'file' | 'link';
  size?: number;
  fechaSubida?: Date;
}

export interface Job {
  id: string;
  nombre: string;
  descripcion: string;
  fechaInicio: string | Date;
  fechaFin: string | Date;
  estado: JobStatus | string;
  prioridad: JobPriority;
  project?: Project;
  trabajadores?: User[]; 
  adjuntos?: JobAttachment[];
  
  // 🔗 CAMBIO AQUÍ: Usar plural para la tabla intermedia
  predecesoras?: any[];   // Esto contendrá el array de JobDependency
  predecesoraId?: string | null; 
  predecesora?: Job | null; // Mantenemos este por si acaso, pero el error pide plural
}