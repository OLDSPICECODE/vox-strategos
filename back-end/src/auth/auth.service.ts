import {
  Injectable,
  OnModuleInit,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { Project } from './entities/project.entity';
import { Job, JobPriority, JobStatus } from './entities/job.entity';
import { Resource } from './entities/resource.entity';
import { JobLog } from './entities/job-log.entity';
import { Pago } from './entities/movimientos.entity';
import {
  JobDependency,
  DependencyType,
} from './entities/job-dependency.entity';

import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger('AuthService');

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(JobLog)
    private readonly jobLogRepository: Repository<JobLog>,
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 🔐 VALIDACIÓN DE ACCESO
   * Compara el hash de la base de datos con la clave plana recibida.
   */
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'role', 'nombreCompleto', 'cargo'],
    });

    // LOG DE DIAGNÓSTICO
    console.log(
      '🔍 Usuario encontrado:',
      user
        ? { ...user, password: user.password ? 'TIENE_HASH' : 'ESTA_VACIO' }
        : 'NULL',
    );

    if (user && user.password) {
      // 🛡️ Verificamos AMBAS cosas antes de llamar a bcrypt
      const isMatch = await bcrypt.compare(pass, user.password);

      if (isMatch) {
        const { password, ...result } = user;
        this.logger.log(`✅ Acceso concedido: ${email}`);
        return result;
      }
    }

    this.logger.warn(`🚫 Intento fallido o datos corruptos para: ${email}`);
    throw new UnauthorizedException(
      'Credenciales inválidas o cuenta mal configurada',
    );
  }
  /**
   * 🚀 AUTO-SIEMBRA AL INICIAR
   */
  async onModuleInit() {
    const userCount = await this.userRepository.count();
    if (userCount === 0) {
      await this.ejecutarSiembra();
    }
  }

  /**
   * 🌱 SIEMBRA TÉCNICA COMPLETA (SEEDER)
   */
  private async ejecutarSiembra() {
    this.logger.log(
      '🌱 Iniciando siembra técnica avanzada para VOX STRATEGOS (Dashboard Ready)...',
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log('🧹 Limpiando tablas para datos frescos...');
      // El orden es vital para evitar errores de llaves foráneas
      const tables = [
        'job_dependencies',
        'pagos',
        'job_workers',
        'project_workers',
        'project_pmis',
        'resources',
        'job_logs',
        'job',
        'projects',
        'user',
      ];
      for (const table of tables) {
        await queryRunner.query(`DELETE FROM "${table}"`);
      }

      // ==========================================
      // 1. POBLACIÓN DE USUARIOS
      // ==========================================
      const salt = await bcrypt.genSalt(10);
      const passHash = await bcrypt.hash('123', salt);

      const pmiManager = await queryRunner.manager.save(User, {
        nombreCompleto: 'Ing. Ricardo Herrera',
        email: 'pmi@vox.com',
        password: passHash,
        role: UserRole.PMI,
        cargo: 'Gerente PMI',
      });

      const staff = await queryRunner.manager.save(User, [
        {
          nombreCompleto: 'Logis M.',
          email: 'logis@vox.com',
          password: passHash,
          role: UserRole.TRABAJADOR,
          cargo: 'Ing. Hidráulico',
        },
        {
          nombreCompleto: 'Ana Belén',
          email: 'ana@vox.com',
          password: passHash,
          role: UserRole.TRABAJADOR,
          cargo: 'Especialista Suelos',
        },
        {
          nombreCompleto: 'Carlos Ruiz',
          email: 'carlos@vox.com',
          password: passHash,
          role: UserRole.TRABAJADOR,
          cargo: 'Técnico de Campo',
        },
      ]);

      // ==========================================
      // 2. LÍNEA TEMPORAL (Anclada a 2026)
      // ==========================================
      const pasado = new Date('2026-02-15T08:00:00');
      const hoy = new Date('2026-03-01T08:00:00');
      const futuroCorto = new Date('2026-03-15T08:00:00');
      const futuroLargo = new Date('2026-05-30T08:00:00');

      // ==========================================
      // 3. PROYECTO 1: RESERVORIO R-10 (Saludable)
      // ==========================================
      const p1 = await queryRunner.manager.save(Project, {
        nombre: 'Construcción de Reservorio R-10 - Sedapar',
        idCodigo: 'SED-2026-R10',
        descripcion:
          'Construcción de reservorio de cabecera para mejorar el abastecimiento en la zona sur.',
        presupuesto: 850000,
        progreso: 45,
        estado: 'EN CURSO',
        objetivos: [
          'Aumentar capacidad de reserva en 500m3',
          'Mejorar presión de agua en 3 distritos',
        ],
        hitos: [
          {
            nombre: 'Firma de Contrato',
            fecha: pasado.toISOString(),
            estado: 'COMPLETO',
            descripcion: 'Inicio legal',
          },
          {
            nombre: 'Vaciado de Losa',
            fecha: hoy.toISOString(),
            estado: 'EN_PROCESO',
            descripcion: 'Fase estructural',
          },
          {
            nombre: 'Pruebas Hidráulicas',
            fecha: futuroLargo.toISOString(),
            estado: 'PENDIENTE',
            descripcion: 'Pruebas finales',
          },
        ],
        pmis: [pmiManager],
        trabajadores: [staff[0], staff[1]],
        fechaInicio: pasado,
        fechaFin: futuroLargo,
      });

      // 💰 Movimientos del P1
      await queryRunner.manager.save(Pago, [
        {
          monto: 150000,
          descripcion: 'Compra de Cemento y Acero',
          tipo: 'SALIDA',
          aceptado: true,
          project: p1,
        },
        {
          monto: 50000,
          descripcion: 'Pago Planilla Febrero',
          tipo: 'SALIDA',
          aceptado: true,
          project: p1,
        },
        {
          monto: 30000,
          descripcion: 'Alquiler Maquinaria Pesada',
          tipo: 'SALIDA',
          aceptado: false,
          project: p1,
        },
      ]);

      // 🛠️ Trabajos P1
      const p1Jobs = await queryRunner.manager.save(Job, [
        {
          nombre: 'Excavación de Base',
          estado: JobStatus.DONE,
          project: p1,
          inGantt: true,
          prioridad: JobPriority.HIGH,
          trabajadores: [staff[0]],
          fechaInicio: pasado,
          fechaFin: hoy,
        },
        {
          nombre: 'Vaciado de Concreto',
          estado: JobStatus.IN_PROGRESS,
          project: p1,
          inGantt: true,
          prioridad: JobPriority.URGENT,
          trabajadores: [staff[1]],
          fechaInicio: hoy,
          fechaFin: futuroCorto,
        },
      ]);

      // 📂 Archivos P1 (Con propiedad URL ficticia para pasar el Not-Null de la BD)
      await queryRunner.manager.save(Resource, [
        {
          nombre: 'Planos_Excavacion.pdf',
          tipo: 'file',
          size: 2500000,
          url: '/uploads/planos.pdf',
          job: p1Jobs[0],
          project: p1,
        },
        {
          nombre: 'Permiso_Municipal.docx',
          tipo: 'file',
          size: 500000,
          url: '/uploads/permiso.docx',
          job: p1Jobs[0],
          project: p1,
        },
        {
          nombre: 'Carpeta Drive Proveedores',
          tipo: 'link',
          url: 'https://drive.google.com/drive/folders/ejemplo',
          job: p1Jobs[1],
          project: p1,
        },
      ]);

      // ==========================================
      // 4. PROYECTO 2: RENOVACIÓN DE TUBERÍAS (Atrasado)
      // ==========================================
      const p2 = await queryRunner.manager.save(Project, {
        nombre: 'Mantenimiento Red Matriz Centro',
        idCodigo: 'SED-2026-MNT',
        descripcion:
          'Reparación de urgencia por fatiga de material en la tubería principal del centro histórico.',
        presupuesto: 120000,
        progreso: 85,
        estado: 'CRÍTICO',
        objetivos: [
          'Sellar 5 puntos de fuga documentados',
          'Reemplazo de válvulas de 10 pulgadas',
        ],
        hitos: [
          {
            nombre: 'Cierre de vías',
            fecha: pasado.toISOString(),
            estado: 'COMPLETO',
            descripcion: 'Tránsito desviado',
          },
          {
            nombre: 'Apertura de zanjas',
            fecha: pasado.toISOString(),
            estado: 'COMPLETO',
            descripcion: 'Excavación lista',
          },
        ],
        pmis: [pmiManager],
        trabajadores: [staff[2], staff[0]],
        fechaInicio: pasado,
        fechaFin: futuroCorto,
      });

      // 💰 Movimientos del P2
      await queryRunner.manager.save(Pago, [
        {
          monto: 110000,
          descripcion: 'Compra de válvulas importadas',
          tipo: 'SALIDA',
          aceptado: true,
          project: p2,
        },
      ]);

      // 🛠️ Trabajos P2
      const p2Jobs = await queryRunner.manager.save(Job, [
        {
          nombre: 'Corte de Asfalto',
          estado: JobStatus.DONE,
          project: p2,
          inGantt: true,
          prioridad: JobPriority.MEDIUM,
          trabajadores: [staff[2]],
          fechaInicio: pasado,
          fechaFin: new Date('2026-02-20T08:00:00'),
        },
        {
          nombre: 'Instalación de Válvulas',
          estado: JobStatus.IN_PROGRESS,
          project: p2,
          inGantt: true,
          prioridad: JobPriority.HIGH,
          trabajadores: [staff[0]],
          fechaInicio: new Date('2026-02-21T08:00:00'),
          fechaFin: new Date('2026-02-28T08:00:00'), // Tarea intencionalmente vencida
        },
      ]);

      // 📂 Archivos P2 (URL ficticia añadida)
      await queryRunner.manager.save(Resource, [
        {
          nombre: 'Reporte_Asfalto.xlsx',
          tipo: 'file',
          size: 1200000,
          url: '/uploads/reporte_asfalto.xlsx',
          job: p2Jobs[0],
          project: p2,
        },
      ]);

      // ==========================================
      // 5. MAPEO DE DEPENDENCIAS
      // ==========================================
      await queryRunner.manager.save(JobDependency, [
        {
          predecessor: p1Jobs[0],
          successor: p1Jobs[1],
          type: DependencyType.FS,
          lag_days: 0,
        },
      ]);

      await queryRunner.commitTransaction();
      this.logger.log(
        '✅ Siembra Multi-Workload y Financiera completada con éxito.',
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`❌ Error en la siembra: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }
}
