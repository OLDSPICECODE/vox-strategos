import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  JobDependency,
  DependencyType,
} from '../../auth/entities/job-dependency.entity';
import { Job, JobStatus } from '../../auth/entities/job.entity';

@Injectable()
export class JobDependenciesService {
  constructor(
    @InjectRepository(JobDependency)
    private readonly dependencyRepo: Repository<JobDependency>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    private dataSource: DataSource,
  ) {}

  /**
   * 🛡️ NORMALIZADOR DE ESTADOS
   * Convierte strings a JobStatus explícitamente para satisfacer a TS.
   */
  private normalizeStatus(status: any): JobStatus | undefined {
    if (!status) return undefined;

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
      map[status] ||
      (Object.values(JobStatus).includes(status)
        ? (status as JobStatus)
        : undefined)
    );
  }

  /**
   * 📦 ACTUALIZACIÓN MASIVA (Batch Update)
   * Corregido el error de tipado ts(2345).
   */
  async updateBatch(
    updates: {
      id: string;
      fechaInicio?: Date;
      fechaFin?: Date;
      estado?: string;
    }[],
  ) {
    return await this.dataSource.transaction(async (manager) => {
      for (const update of updates) {
        // Creamos un objeto de actualización con el tipo parcial de Job
        // Usamos Record<string, any> para construirlo dinámicamente sin quejas de TS
        const updateData: any = {
          id: update.id,
          inGantt: true,
          updatedAt: new Date(),
        };

        if (update.fechaInicio) updateData.fechaInicio = update.fechaInicio;
        if (update.fechaFin) updateData.fechaFin = update.fechaFin;

        // Normalización con casting explícito a JobStatus
        if (update.estado) {
          updateData.estado = this.normalizeStatus(update.estado);
        }

        // Preload reconoce el objeto porque updateData tiene el 'id'
        const jobToUpdate = await manager.preload(Job, updateData);

        if (jobToUpdate) {
          await manager.save(Job, jobToUpdate);
        }
      }

      // Recálculo de cascada tras sincronizar todos los nodos
      for (const update of updates) {
        await this.rescheduleChain(update.id);
      }

      return { success: true, count: updates.length };
    });
  }

  /**
   * 🔄 RECÁLCULO EN CASCADA
   */
  async rescheduleChain(jobId: string): Promise<void> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['successor_relations', 'successor_relations.successor'],
    });

    if (!job || !job.fechaFin || !job.successor_relations?.length) return;

    for (const dep of job.successor_relations) {
      const successor = dep.successor;

      if (!successor?.inGantt || !successor.fechaInicio || !successor.fechaFin)
        continue;

      let needsUpdate = false;
      if (dep.type === DependencyType.FS) {
        const minStartDate = new Date(job.fechaFin.getTime());
        minStartDate.setDate(minStartDate.getDate() + (dep.lag_days || 0));

        if (successor.fechaInicio < minStartDate) {
          const duration =
            successor.fechaFin.getTime() - successor.fechaInicio.getTime();
          successor.fechaInicio = minStartDate;
          successor.fechaFin = new Date(minStartDate.getTime() + duration);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await this.jobRepo.save(successor);
        await this.rescheduleChain(successor.id);
      }
    }
  }

  /**
   * 🕸️ CREAR DEPENDENCIA
   */
  async createDependency(
    predecessorId: string,
    successorId: string,
    type: DependencyType,
    lag: number,
  ) {
    if (predecessorId === successorId)
      throw new BadRequestException(
        'Un trabajo no puede depender de sí mismo.',
      );

    const [pred, succ] = await Promise.all([
      this.jobRepo.findOne({ where: { id: predecessorId } }),
      this.jobRepo.findOne({ where: { id: successorId } }),
    ]);

    if (!pred || !succ)
      throw new NotFoundException('Uno de los trabajos no fue encontrado.');

    const hasCycle = await this.detectCycle(predecessorId, successorId);
    if (hasCycle) {
      throw new BadRequestException(
        'Relación inválida: Se detectó un bucle infinito.',
      );
    }

    if (type === DependencyType.FS && succ.fechaInicio && pred.fechaFin) {
      if (new Date(succ.fechaInicio) < new Date(pred.fechaFin)) {
        throw new BadRequestException(
          'Inconsistencia: El sucesor inicia antes del fin del predecesor.',
        );
      }
    }

    const dependency = this.dependencyRepo.create({
      predecessor: pred,
      successor: succ,
      type,
      lag_days: lag || 0,
    });

    return await this.dependencyRepo.save(dependency);
  }

  /**
   * 🔍 DETECCIÓN DE CICLOS
   */
  private async detectCycle(predId: string, succId: string): Promise<boolean> {
    const children = await this.dependencyRepo.find({
      where: { predecessor: { id: succId } },
      relations: ['successor'],
    });

    for (const dep of children) {
      if (dep.successor.id === predId) return true;
      if (await this.detectCycle(predId, dep.successor.id)) return true;
    }
    return false;
  }

  /**
   * 🧹 SALIR DEL GANTT
   */
  async removeFromGantt(jobId: string) {
    await this.jobRepo.update(jobId, { inGantt: false });
    return await this.dependencyRepo.delete([
      { predecessor: { id: jobId } },
      { successor: { id: jobId } },
    ]);
  }

  async getDependenciesByProject(projectId: string) {
    return await this.dependencyRepo.find({
      where: { successor: { project: { id: projectId } } },
      relations: ['predecessor', 'successor'],
      order: { successor: { fechaInicio: 'ASC' } },
    });
  }

  async removeDependency(id: string) {
    const result = await this.dependencyRepo.delete(id);
    if (result.affected === 0)
      throw new NotFoundException('La conexión no existe.');
    return { deleted: true };
  }
}
