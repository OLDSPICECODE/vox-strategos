import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Job } from './job.entity';

@Entity('job_logs')
export class JobLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuario: string; // Ejemplo: "LOGIS M."

  @Column()
  accion: string; // "CREACIÓN", "ESTADO", "ADJUNTO"

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'text', nullable: true })
  comentario: string;

  @CreateDateColumn()
  fecha: Date;

  // Relación con la tarea técnica
  @ManyToOne(() => Job, (job) => job.id, { onDelete: 'CASCADE' })
  job: Job;
}