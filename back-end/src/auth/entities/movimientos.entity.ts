import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  CreateDateColumn 
} from 'typeorm';
import { Project } from './project.entity';

/**
 * 💸 ENTIDAD DE MOVIMIENTOS ECONÓMICOS
 * Representa cada registro individual (estilo Excel) de los gastos o ingresos
 * de los proyectos de Sedapar.
 */
@Entity('pagos')
export class Pago {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ 
    type: 'decimal', 
    precision: 12, 
    scale: 2,
    comment: 'Monto de la transacción' 
  })
  monto: number;

  @Column({ 
    type: 'varchar', 
    length: 255,
    comment: 'Descripción del movimiento (ej: Pago de planilla, Compra de válvulas)' 
  })
  descripcion: string;

  @Column({ 
    type: 'enum', 
    enum: ['SALIDA', 'ENTRADA'], 
    default: 'SALIDA',
    comment: 'Categorización del flujo de caja'
  })
  tipo: string;

  @CreateDateColumn({ 
    name: 'fecha_pago',
    comment: 'Fecha automática de registro del movimiento' 
  })
  fechaPago: Date;

  /**
   * ⚓ EL ANCLA:
   * Relación ManyToOne con Project. 
   * Muchos pagos pertenecen a un solo Proyecto.
   */
  @ManyToOne(() => Project, (project) => project.movimientos, { 
    onDelete: 'CASCADE' 
  })
  project: Project;
}