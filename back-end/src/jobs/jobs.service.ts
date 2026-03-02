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
   * 📊 HISTORIAL GLOBAL (Dashboard PMI)
   */
  async getGlobalLogs(): Promise<JobLog[]> {
    return await this.logRepository.find({
      relations: ['job'],
      order: { fecha: 'DESC' },
      take: 20,
    });
  }

  /**
   * 📜 HISTORIAL POR TAREA
   */
  async getJobLogs(jobId: string): Promise<JobLog[]> {
    return await this.logRepository.find({
      where: { job: { id: jobId } },
      order: { fecha: 'DESC' },
    });
  }

  /**
   * 💾 GUARDAR ACTIVIDAD (Log)
   */
  async saveJobLog(jobId: string, logData: any): Promise<JobLog> {
    try {
      const newLog = this.logRepository.create({
        usuario: logData.usuario,
        accion: logData.accion,
        descripcion: logData.descripcion,
        comentario: logData.comentario || 'Sin observaciones.',
        job: { id: jobId },
        fecha: new Date(),
      });
      return await this.logRepository.save(newLog);
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al registrar en la bitácora.',
      );
    }
  }

  /**
   * 🚀 CREAR TAREA
   */
  async create(data: any): Promise<Job> {
    const project = await this.projectRepository.findOne({
      where: { id: data.projectId },
      relations: ['trabajadores'],
    });

    // 🛡️ Guardia contra null
    if (!project)
      throw new NotFoundException('El proyecto no existe en Sedapar.');

    const isMember = project.trabajadores.some(
      (w) => w.id === data.trabajadorId,
    );
    if (!isMember)
      throw new BadRequestException('El trabajador no pertenece al proyecto.');

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
   * 📅 BÚSQUEDA POR RANGO (Calendario/Gantt)
   */
  async findByDateRange(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<Job[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return await this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.project', 'project')
      .leftJoinAndSelect('job.trabajadores', 'trabajador')
      .where('trabajador.id = :userId', { userId })
      .andWhere(
        'job.fechaInicio <= :endRange AND job.fechaFin >= :startRange',
        { startRange: start, endRange: end },
      )
      .orderBy('job.fechaInicio', 'ASC')
      .getMany();
  }

  /**
   * 🔄 ACTUALIZACIÓN GENERAL
   */
  async update(id: string, data: any): Promise<Job> {
    const job = await this.findOne(id);

    // Si se intenta reasignar, validamos existencia de project y trabajador
    if (data.trabajadorId && job.project) {
      const project = await this.projectRepository.findOne({
        where: { id: job.project.id },
        relations: ['trabajadores'],
      });

      if (!project)
        throw new NotFoundException('Proyecto vinculado no encontrado.');

      const isMember = project.trabajadores.some(
        (w) => w.id === data.trabajadorId,
      );
      if (!isMember)
        throw new BadRequestException(
          'El nuevo trabajador no pertenece al equipo.',
        );

      job.trabajadores = [{ id: data.trabajadorId } as any];
    }

    const { project, trabajadores, adjuntos, ...cleanData } = data;
    this.jobRepository.merge(job, cleanData);
    return await this.jobRepository.save(job);
  }

  /**
   * ⚡ CAMBIO DE ESTADO
   */
  async updateStatus(
    id: string,
    estado: string,
    usuario: string,
    comentario?: string,
  ): Promise<Job> {
    const job = await this.findOne(id);
    const estadoAnterior = job.estado;

    await this.jobRepository.update(id, { estado: estado as JobStatus });

    await this.saveJobLog(id, {
      usuario,
      accion: 'CAMBIO_ESTADO',
      descripcion: `Cambió estado de "${estadoAnterior}" a "${estado}"`,
      comentario,
    });

    return await this.findOne(id);
  }

  /**
   * 🔍 BUSCAR POR ID
   */
  async findOne(id: string): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['project', 'trabajadores'],
    });
    if (!job) throw new NotFoundException('Tarea técnica no encontrada.');
    return job;
  }

  /**
   * 📂 GESTIÓN DE RECURSOS Y ADJUNTOS
   */
  async addAttachment(
    jobId: string,
    attachment: any,
    usuario: string,
  ): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['project'],
    });

    // 🛡️ Guardia contra null para 'job' y 'project'
    if (!job || !job.project) {
      throw new NotFoundException(
        'No se pudo encontrar la tarea o el proyecto asociado.',
      );
    }

    const nuevoRecurso = this.resourceRepository.create({
      nombre: attachment.nombre,
      url: attachment.url,
      project: { id: job.project.id },
      job: { id: job.id },
    });
    await this.resourceRepository.save(nuevoRecurso);

    job.adjuntos = [
      ...(job.adjuntos || []),
      { ...attachment, id: Date.now().toString() },
    ];

    await this.saveJobLog(jobId, {
      usuario,
      accion: 'SUBIDA_ARCHIVO',
      descripcion: `Subió el archivo técnico: ${attachment.nombre}`,
    });

    return await this.jobRepository.save(job);
  }

  /**
   * 🔍 BUSCAR TAREAS POR USUARIO
   * Lista todas las tareas asignadas a un trabajador específico.
   */
  async findByUser(userId: string): Promise<Job[]> {
    return await this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.project', 'project')
      .leftJoinAndSelect('job.trabajadores', 'trabajador')
      .where('trabajador.id = :userId', { userId })
      .orderBy('job.prioridad', 'DESC')
      .getMany();
  }

  async findByProject(projectId: string) {
    return await this.jobRepository.find({
      where: { project: { id: projectId } },
      order: { fechaInicio: 'ASC' },
    });
  }
}
