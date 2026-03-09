import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus } from '../auth/entities/job.entity';
import { Project } from '../auth/entities/project.entity';
import { JobLog } from '../auth/entities/job-log.entity';
import { Resource } from '../auth/entities/resource.entity';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(JobLog)
    private readonly logRepository: Repository<JobLog>,
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
  ) {}

  /**
   * 🛡️ NORMALIZADOR DE ESTADOS (Escudo Anti-Error 22P02 de Postgres)
   */
  private normalizeStatus(estado: any): JobStatus | undefined {
    if (!estado) return undefined;
    const map: { [key: string]: JobStatus } = {
      PENDIENTE: JobStatus.PENDING,
      'POR HACER': JobStatus.TODO,
      'EN PROCESO': JobStatus.IN_PROGRESS,
      REVISIÓN: JobStatus.REVIEW,
      COMPLETADO: JobStatus.DONE,
      DONE: JobStatus.DONE,
      pending: JobStatus.PENDING,
      'To Do': JobStatus.TODO,
      'In Progress': JobStatus.IN_PROGRESS,
      Reviewing: JobStatus.REVIEW,
      Done: JobStatus.DONE,
    };
    return (
      map[estado] ||
      (Object.values(JobStatus).includes(estado)
        ? (estado as JobStatus)
        : undefined)
    );
  }

  /**
   * 🔄 ACTUALIZACIÓN GENERAL
   * Soluciona el problema de Enums y mapeo de trabajadores.
   */
  async update(id: string, data: any): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['project', 'trabajadores'],
    });

    if (!job) throw new NotFoundException('Tarea técnica no encontrada.');

    // 1. Normalización del Estado
    if (data.estado) {
      const normalized = this.normalizeStatus(data.estado);
      if (normalized) job.estado = normalized;
    }

    // 2. Manejo de múltiples trabajadores
    if (data.trabajadores && Array.isArray(data.trabajadores)) {
      job.trabajadores = data.trabajadores.map(
        (t: any) => ({ id: typeof t === 'string' ? t : t.id }) as any,
      );
    }

    // 3. Limpieza de campos especiales para evitar conflictos en el merge
    const { project, trabajadores, adjuntos, ...cleanData } = data;

    if (cleanData.fechaInicio)
      cleanData.fechaInicio = new Date(cleanData.fechaInicio);
    if (cleanData.fechaFin) cleanData.fechaFin = new Date(cleanData.fechaFin);

    // Fusionamos datos simples
    this.jobRepository.merge(job, cleanData);

    const updatedJob = await this.jobRepository.save(job);

    // 4. Registro en Bitácora
    await this.saveJobLog(id, {
      usuario: data.usuarioUltimaMod || 'Sistema Vox',
      accion: 'ACTUALIZACIÓN_GENERAL',
      descripcion: `Se actualizaron datos técnicos de la tarea.`,
    });

    return updatedJob;
  }

  /**
   * ⚡ CAMBIO DE ESTADO (Para botones rápidos)
   */
  async updateStatus(
    id: string,
    estado: string,
    usuario: string,
    comentario?: string,
  ): Promise<Job> {
    const job = await this.findOne(id);
    const estadoAnterior = job.estado;

    const nuevoEstado = this.normalizeStatus(estado);
    if (!nuevoEstado)
      throw new BadRequestException(`Estado "${estado}" inválido.`);

    await this.jobRepository.update(id, { estado: nuevoEstado });

    await this.saveJobLog(id, {
      usuario,
      accion: 'CAMBIO_ESTADO',
      descripcion: `Cambio: ${estadoAnterior} -> ${nuevoEstado}`,
      comentario,
    });

    return await this.findOne(id);
  }

  /**
   * 🚀 CREAR TAREA
   */
  async create(data: any): Promise<Job> {
    const project = await this.projectRepository.findOne({
      where: { id: data.projectId },
      relations: ['trabajadores'],
    });

    if (!project) throw new NotFoundException('El proyecto no existe.');

    const newJob = this.jobRepository.create({
      nombre: data.nombre,
      descripcion: data.descripcion,
      fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : new Date(),
      fechaFin: new Date(data.fechaFin),
      estado: JobStatus.TODO,
      prioridad: data.prioridad,
      project: { id: data.projectId },
      trabajadores: [{ id: data.trabajadorId }],
      adjuntos: [],
    });

    return await this.jobRepository.save(newJob);
  }

  /**
   * 📅 BÚSQUEDAS (Gantt y Proyectos)
   */
  async findByProject(projectId: string): Promise<Job[]> {
    return await this.jobRepository.find({
      where: { project: { id: projectId } },
      order: { fechaInicio: 'ASC' },
      relations: ['trabajadores'],
    });
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['project', 'trabajadores'],
    });
    if (!job) throw new NotFoundException('Tarea no encontrada.');
    return job;
  }

  async findAll(): Promise<Job[]> {
    return await this.jobRepository.find({
      relations: ['project', 'trabajadores'],
      order: { nombre: 'ASC' },
    });
  }

  async findByUser(userId: string): Promise<Job[]> {
    return await this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.project', 'project')
      .leftJoinAndSelect('job.trabajadores', 'trabajador')
      .where('trabajador.id = :userId', { userId })
      .orderBy('job.prioridad', 'DESC')
      .getMany();
  }

  async findByDateRange(
    userId: string,
    start: string,
    end: string,
  ): Promise<Job[]> {
    return await this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.project', 'project')
      .leftJoinAndSelect('job.trabajadores', 'trabajador')
      .where('trabajador.id = :userId', { userId })
      .andWhere(
        'job.fechaInicio <= :endRange AND job.fechaFin >= :startRange',
        {
          startRange: new Date(start),
          endRange: new Date(end),
        },
      )
      .orderBy('job.fechaInicio', 'ASC')
      .getMany();
  }

  /**
   * 📜 GESTIÓN DE BITÁCORA (LOGS)
   * Corregido el error ts(2740) asegurando que devuelve JobLog individual.
   */
  async saveJobLog(
    jobId: string,
    logData: {
      usuario: string;
      accion: string;
      descripcion: string;
      comentario?: string;
    },
  ): Promise<JobLog> {
    try {
      const newLog = this.logRepository.create({
        usuario: logData.usuario,
        accion: logData.accion,
        descripcion: logData.descripcion,
        comentario: logData.comentario || 'Sin observaciones.',
        job: { id: jobId } as any, // Cast para evitar conflictos de relación profunda
        fecha: new Date(),
      });
      return await this.logRepository.save(newLog);
    } catch (error) {
      throw new InternalServerErrorException('Error al guardar log.');
    }
  }

  async getJobLogs(jobId: string): Promise<JobLog[]> {
    return await this.logRepository.find({
      where: { job: { id: jobId } },
      order: { fecha: 'DESC' },
    });
  }

  async getGlobalLogs(): Promise<JobLog[]> {
    return await this.logRepository.find({
      relations: ['job'],
      order: { fecha: 'DESC' },
      take: 20,
    });
  }

  /**
   * 📂 ADJUNTOS
   */
  async addAttachment(
    jobId: string,
    attachment: any,
    usuario: string,
  ): Promise<Job> {
    const job = await this.findOne(jobId);

    // Guardar en tabla Resource
    const nuevoRecurso = this.resourceRepository.create({
      nombre: attachment.nombre,
      url: attachment.url,
      project: { id: job.project.id } as any,
      job: { id: job.id } as any,
    });
    await this.resourceRepository.save(nuevoRecurso);

    // Actualizar JSON en tabla Job
    job.adjuntos = [
      ...(job.adjuntos || []),
      { ...attachment, id: Date.now().toString() },
    ];

    await this.saveJobLog(jobId, {
      usuario,
      accion: 'SUBIDA_ARCHIVO',
      descripcion: `Archivo subido: ${attachment.nombre}`,
    });

    return await this.jobRepository.save(job);
  }
}
