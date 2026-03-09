// src/jobs/entities/milestone.entity.ts (Ajusta la ruta si es necesario)
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Project } from './project.entity';

@Entity('milestones')
export class Milestone {
  @PrimaryGeneratedColumn('uuid') // 👈 Cambiado a UUID para que coincida con Angular
  id: string;

  @Column()
  nombre: string;

  @Column({ type: 'date' })
  fecha: string; // 👈 Cambiado de fechaEntrega a fecha

  @Column({ default: 'PENDIENTE' })
  estado: string; // 👈 Cambiado de completado (boolean) a estado (string)

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  porcentajeImpacto: number;

  // 👈 Relación conectada a la propiedad 'hitos' del proyecto
  @ManyToOne(() => Project, (project) => project.hitos, { onDelete: 'CASCADE' })
  project: Project;

  @CreateDateColumn()
  createdAt: Date;
}