import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { Job } from './job.entity';

export enum DependencyType {
  FS = 'FS', // Fin a Inicio
  SS = 'SS', // Inicio a Inicio
  FF = 'FF', // Fin a Fin
  SF = 'SF', // Inicio a Fin
}

@Entity('job_dependencies')
@Unique(['predecessor', 'successor']) // Evita duplicados
export class JobDependency {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Job, (job) => job.successor_relations, { onDelete: 'CASCADE' })
  predecessor: Job;

  @ManyToOne(() => Job, (job) => job.predecessor_relations, { onDelete: 'CASCADE' })
  successor: Job;

  @Column({
    type: 'enum',
    enum: DependencyType,
    default: DependencyType.FS,
  })
  type: DependencyType;

  @Column({ default: 0 })
  lag_days: number;
}