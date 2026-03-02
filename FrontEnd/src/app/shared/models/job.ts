import { User } from './user';
import { Project } from './project';

export enum JobStatus {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done'
}

export enum JobPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent'
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
  estado: JobStatus;
  prioridad: JobPriority;
  project?: Project;
  trabajadores?: User[]; 
  adjuntos?: JobAttachment[]; // 🚀 Slot para archivos y enlaces
}