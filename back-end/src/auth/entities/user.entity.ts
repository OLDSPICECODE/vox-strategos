import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn, 
  BeforeInsert,
  ManyToMany 
} from 'typeorm';
import { Job } from './job.entity';
import { Project } from './project.entity';

export enum UserRole {
  TRABAJADOR = 'trabajador',
  PMI = 'pmi',
  JEFE = 'jefe'
}

/**
 * Entidad de Usuario para Vox Strategos / Sedapar.
 * Almacena información crítica, roles y cargos técnicos.
 */
@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombreCompleto: string;

  @Column({ unique: true, type: 'varchar', length: 100 })
  email: string;

  @Column({ select: false }) 
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.TRABAJADOR,
  })
  role: UserRole;

  @Column({ nullable: true })
  photoUrl: string;

  /**
   * 🛠️ CARGO TÉCNICO: 
   * Vital para mostrar en el Staff del modal (Ej: 'Ingeniero Hidráulico')
   */
  @Column({ nullable: true })
  cargo: string;

  @Column({ default: true })
  isActive: boolean;

  // --- RELACIONES ---

  /**
   * Un trabajador puede estar asignado a muchas tareas (Jobs).
   */
  @ManyToMany(() => Job, (job) => job.trabajadores)
  jobs: Job[];

  /**
   * Proyectos oficiales en los que el usuario está asignado como equipo de campo.
   * Esto permite filtrar qué tareas puede ver y editar.
   */
  @ManyToMany(() => Project, (project) => project.trabajadores)
  projects: Project[];

  // --- METADATOS ---

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Normalización de datos antes de la persistencia.
   */
  @BeforeInsert()
  cleanData() {
    this.email = this.email.toLowerCase().trim();
  }
}