// src/jobs/entities/milestone.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Project } from './project.entity';

@Entity('milestones')
export class Milestone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string; // Ej: "Instalación de tuberías primaria 25%"

  @Column({ type: 'date' })
  fechaEntrega: Date;

  @Column({ default: false })
  completado: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  porcentajeImpacto: number; // Cuanto suma al progreso total del proyecto

  @ManyToOne(() => Project, (project) => project.id, { onDelete: 'CASCADE' })
  project: Project;

  @CreateDateColumn()
  createdAt: Date;
}