// pago.entity.ts (Backend NestJS)
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';

@Entity('pagos')
export class Pago {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({ type: 'varchar', length: 255 })
  descripcion: string;

  @Column({ type: 'enum', enum: ['SALIDA', 'ENTRADA'], default: 'SALIDA' })
  tipo: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Indica si el movimiento ya fue aprobado/ejecutado por tesorería',
  })
  aceptado: boolean;

  @CreateDateColumn({ name: 'fecha_pago' })
  fechaPago: Date;

  @ManyToOne(() => Project, (project) => project.movimientos, {
    onDelete: 'CASCADE',
  })
  project: Project;
}
