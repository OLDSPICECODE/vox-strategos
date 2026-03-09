import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  AfterLoad,
} from 'typeorm';
import { User } from './user.entity';
import { Job } from './job.entity';
import { Resource } from './resource.entity';
import { Pago } from './movimientos.entity';
import { Milestone } from './milestone.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nombre: string;

  @Column({ nullable: true })
  idCodigo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'timestamp' })
  fechaInicio: Date;

  @Column({ type: 'timestamp' })
  fechaFin: Date;

  // --- GESTIÓN FINANCIERA CENTRALIZADA ---
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  presupuestoTotal: number;

  /**
   * 💰 MOVIMIENTOS ECONÓMICOS:
   * Aquí se registran todos los pagos, facturas o salidas de dinero de Sedapar.
   */
  @OneToMany(() => Pago, (pago) => pago.project, { cascade: true, eager: true })
  movimientos: Pago[];

  // --- DATOS TÉCNICOS (JSON) ---
  @Column({ type: 'simple-json', nullable: true })
  objetivos: string[];

  @OneToMany(() => Milestone, (milestone) => milestone.project, {
    cascade: true,
    eager: true,
  })
  hitos: Milestone[];

  // --- RELACIONES OPERATIVAS ---
  @OneToMany(() => Job, (job) => job.project, { cascade: true })
  trabajos: Job[];

  @ManyToMany(() => User)
  @JoinTable({ name: 'project_pmis' })
  pmis: User[];

  @ManyToMany(() => User)
  @JoinTable({ name: 'project_workers' })
  trabajadores: User[];

  @OneToMany(() => Resource, (resource) => resource.project, { cascade: true })
  recursos: Resource[];

  // --- CAMPOS CALCULADOS (Virtuales) ---
  presupuestoConsumido: number; // 👈 Ahora es virtual
  progreso: number;
  estado: string;

  /**
   * 🛠️ LÓGICA DE NEGOCIO:
   * Calcula el gasto real sumando los movimientos al cargar la entidad.
   */
  @AfterLoad()
  calculateMetadata() {
    // 1. Sumamos todos los pagos vinculados para obtener el consumido real
    this.presupuestoConsumido = 0;
    if (this.movimientos && this.movimientos.length > 0) {
      this.presupuestoConsumido = this.movimientos.reduce(
        (total, pago) => total + Number(pago.monto),
        0,
      );
    }

    // 2. Cálculo de progreso basado en el gasto acumulado
    if (this.presupuestoTotal > 0) {
      this.progreso = Math.round(
        (this.presupuestoConsumido / Number(this.presupuestoTotal)) * 100,
      );
    } else {
      this.progreso = 0;
    }

    // 3. Determinación de estado temporal
    const ahora = new Date();
    if (ahora < new Date(this.fechaInicio)) {
      this.estado = 'PLANIFICACIÓN';
    } else if (ahora > new Date(this.fechaFin)) {
      this.estado = 'FINALIZADO';
    } else {
      this.estado = 'EN CURSO';
    }
  }

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
