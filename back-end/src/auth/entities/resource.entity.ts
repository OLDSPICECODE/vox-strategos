import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  CreateDateColumn 
} from 'typeorm';
import { Project } from './project.entity';
import { Job } from './job.entity';

@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  nombre: string; // Ej: "Plano Hidráulico A-1" o "Manual de Seguridad"

  @Column({ type: 'text' })
  url: string; // Link a Drive, Notion o SharePoint

  /**
   * Relación con Proyectos:
   * Muchos recursos pueden pertenecer a un proyecto general.
   * Si 'job' es null, el recurso es propio del proyecto.
   */
  @ManyToOne(() => Project, (project) => project.recursos, { onDelete: 'CASCADE', nullable: true })
  project: Project;

  /**
   * Relación con Trabajos:
   * Muchos recursos pueden pertenecer a un trabajo específico.
   */
  @ManyToOne(() => Job, (job) => job.recursos, { onDelete: 'CASCADE', nullable: true })
  job: Job;

  @CreateDateColumn()
  createdAt: Date;
}