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
      '🌱 Iniciando siembra técnica avanzada para VOX STRATEGOS...',
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

      // 1. POBLACIÓN DE USUARIOS
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
      ]);

      // 2. DEFINICIÓN DE LÍNEA TEMPORAL (Anclada a 2026 para evitar timeline erróneo)
      const hoy = new Date('2026-03-01T08:00:00');
      const d1 = new Date('2026-03-03T08:00:00');
      const d2 = new Date('2026-03-05T08:00:00');
      const d3 = new Date('2026-03-07T08:00:00');
      const d4 = new Date('2026-03-10T08:00:00');

      // 3. PROYECTO PRINCIPAL
      const p1 = await queryRunner.manager.save(Project, {
        nombre: 'Construcción de Reservorio R-10 - Sedapar',
        idCodigo: 'SED-2026-GANTT',
        presupuestoTotal: 850000,
        pmis: [pmiManager],
        trabajadores: staff,
        fechaInicio: hoy,
        fechaFin: d4,
      });

      // 4. CREACIÓN DE TRABAJOS (Diseñados para probar la red de trabajo)
      const savedJobs = await queryRunner.manager.save(Job, [
        {
          nombre: 'Excavación de Base', // Predecesor de todos
          estado: JobStatus.DONE,
          project: p1,
          inGantt: true,
          prioridad: JobPriority.HIGH,
          trabajadores: [staff[0]],
          fechaInicio: hoy,
          fechaFin: d1,
        },
        {
          nombre: 'Vaciado de Concreto', // FS: Espera a que termine la excavación
          estado: JobStatus.IN_PROGRESS,
          project: p1,
          inGantt: true,
          prioridad: JobPriority.URGENT,
          trabajadores: [staff[1]],
          fechaInicio: d1,
          fechaFin: d2,
        },
        {
          nombre: 'Supervisión Técnica', // SS: Inicia junto con el vaciado
          estado: JobStatus.IN_PROGRESS,
          project: p1,
          inGantt: true,
          prioridad: JobPriority.MEDIUM,
          trabajadores: [staff[0]],
          fechaInicio: d1,
          fechaFin: d3,
        },
        {
          nombre: 'Pruebas de Resistencia', // FF: No termina hasta que la supervisión termine
          estado: JobStatus.PENDING,
          project: p1,
          inGantt: true,
          prioridad: JobPriority.LOW,
          trabajadores: [staff[1]],
          fechaInicio: d2,
          fechaFin: d3,
        },
        {
          nombre: 'Cierre de Fase 1', // SF: Su fin depende del inicio de otra tarea
          estado: JobStatus.PENDING,
          project: p1,
          inGantt: true,
          prioridad: JobPriority.MEDIUM,
          trabajadores: [staff[0]],
          fechaInicio: d3,
          fechaFin: d4,
        },
      ]);

      // 5. MAPEO DE TODOS LOS TIPOS DE DEPENDENCIAS
      await queryRunner.manager.save(JobDependency, [
        {
          predecessor: savedJobs[0], // Excavación
          successor: savedJobs[1], // Vaciado
          type: DependencyType.FS, // Finish-to-Start
          lag_days: 0,
        },
        {
          predecessor: savedJobs[1], // Vaciado
          successor: savedJobs[2], // Supervisión
          type: DependencyType.SS, // Start-to-Start
          lag_days: 0,
        },
        {
          predecessor: savedJobs[2], // Supervisión
          successor: savedJobs[3], // Pruebas
          type: DependencyType.FF, // Finish-to-Finish
          lag_days: 0,
        },
        {
          predecessor: savedJobs[3], // Pruebas
          successor: savedJobs[4], // Cierre
          type: DependencyType.SF, // Start-to-Finish
          lag_days: 1,
        },
      ]);

      // 6. TAREA EN EL BACKLOG (Para probar "La Nuez" del sidebar)
      await queryRunner.manager.save(Job, {
        nombre: 'Revisión Documentaria Administrativa',
        estado: JobStatus.TODO,
        project: p1,
        inGantt: false, // 👈 Importante: aparecerá en la lista lateral
        prioridad: JobPriority.LOW,
        trabajadores: [staff[1]],
        fechaInicio: null,
        fechaFin: null,
      });

      await queryRunner.commitTransaction();
      this.logger.log('✅ Siembra GANTT Multi-Workload completada con éxito.');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`❌ Error en la siembra: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }
}
