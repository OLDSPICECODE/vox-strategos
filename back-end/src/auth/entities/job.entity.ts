import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { User } from './user.entity';
import { Resource } from './resource.entity';
import { JobLog } from './job-log.entity';
import { JobDependency } from './job-dependency.entity';

export enum JobStatus {
  PENDING = 'pending',
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  REVIEW = 'Reviewing',
  DONE = 'Done',
}

export enum JobPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent',
}

export interface JobAttachment {
  id?: string;
  nombre: string;
  url: string;
  tipo: 'file' | 'link';
  createdAt?: Date;
}

@Entity('job')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  /**
   * 🕒 FECHAS:
   * Nullable: true permite que un trabajador cree una tarea rápida sin definir cronograma.
   * El PMI las hará obligatorias al integrar la tarea al Gantt.
   */
  // En job.entity.ts

  @Column({ type: 'timestamp', nullable: true })
  fechaInicio: Date | null; // 👈 Agrega '| null' aquí

  @Column({ type: 'timestamp', nullable: true })
  fechaFin: Date | null; // 👈 Agrega '| null' aquí

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.TODO,
  })
  estado: JobStatus;

  @Column({
    type: 'enum',
    enum: JobPriority,
    default: JobPriority.MEDIUM,
  })
  prioridad: JobPriority;

  /**
   * 🚩 CONTROL GANTT:
   * Define si la tarea es visible en el cronograma maestro o es solo operativa.
   */
  @Column({ type: 'boolean', default: false })
  inGantt: boolean;

  // --- RELACIONES DE DEPENDENCIA (GANTT) ---

  @OneToMany(() => JobDependency, (dep) => dep.successor)
  predecessor_relations: JobDependency[];

  @OneToMany(() => JobDependency, (dep) => dep.predecessor)
  successor_relations: JobDependency[];

  // --- RELACIONES DE NEGOCIO ---

  /**
   * Nullable: true permite tareas sueltas/personales que no pertenecen a un proyecto de Sedapar.
   */
  @ManyToOne(() => Project, (project) => project.trabajos, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  project: Project;

  @OneToMany(() => JobLog, (log) => log.job)
  logs: JobLog[];

  @ManyToMany(() => User, (user) => user.jobs)
  @JoinTable({
    name: 'job_workers',
    joinColumn: { name: 'jobId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  trabajadores: User[];

  @OneToMany(() => Resource, (resource) => resource.job, { cascade: true })
  recursos: Resource[];

  /**
   * 📂 ADJUNTOS: Metadatos de archivos y links.
   */
  @Column({
    type: 'json',
    nullable: true,
    default: [],
  })
  adjuntos: JobAttachment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
