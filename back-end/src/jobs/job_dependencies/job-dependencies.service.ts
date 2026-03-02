import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import {
  JobDependency,
  DependencyType,
} from '../../auth/entities/job-dependency.entity';
import { Job } from '../../auth/entities/job.entity';

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
   * 🕸️ CREAR DEPENDENCIA
   * Valida existencia, previene ciclos e inconsistencias de fechas.
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

    // 1. Blindaje contra bucles infinitos
    const hasCycle = await this.detectCycle(predecessorId, successorId);
    if (hasCycle) {
      throw new BadRequestException(
        'Relación inválida: Se detectó un bucle infinito en la cadena de tareas.',
      );
    }

    // 2. Validación de Fechas (Regla: El sucesor no puede empezar antes que el fin del predecesor)
    if (type === DependencyType.FS && succ.fechaInicio && pred.fechaFin) {
      if (succ.fechaInicio < pred.fechaFin) {
        throw new BadRequestException(
          'Inconsistencia: La fecha de inicio del sucesor es anterior al fin del predecesor.',
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
   * 🔄 RECÁLCULO EN CASCADA
   * Si una tarea cambia, "empuja" cronológicamente a todos sus sucesores.
   */
  async rescheduleChain(jobId: string): Promise<void> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['successor_relations', 'successor_relations.successor'],
    });

    // Type Guard: Si no hay fechas o no hay sucesores, no hay nada que recalcular
    if (!job || !job.fechaFin || !job.successor_relations?.length) return;

    for (const dep of job.successor_relations) {
      const successor = dep.successor;

      // Solo procesamos si el sucesor está activo en el Gantt y tiene fechas válidas
      if (!successor?.inGantt || !successor.fechaInicio || !successor.fechaFin)
        continue;

      let needsUpdate = false;
      if (dep.type === DependencyType.FS) {
        // Usamos una copia para no mutar la original accidentalmente
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
        await this.rescheduleChain(successor.id); // Cascada recursiva
      }
    }
  }

  /**
   * 📦 ACTUALIZACIÓN MASIVA (Batch Update)
   * Procesa múltiples cambios de fechas y dispara el recálculo.
   */
  async updateBatch(
    updates: { id: string; fechaInicio: Date; fechaFin: Date }[],
  ) {
    return await this.dataSource.transaction(async (manager) => {
      for (const update of updates) {
        await manager.update(Job, update.id, {
          fechaInicio: update.fechaInicio,
          fechaFin: update.fechaFin,
          inGantt: true,
        });
      }

      // Una vez actualizados los nodos principales, recalculamos sus cadenas
      for (const update of updates) {
        await this.rescheduleChain(update.id);
      }

      return { success: true, count: updates.length };
    });
  }

  /**
   * 🔍 DETECCIÓN DE CICLOS
   */
  private async detectCycle(predId: string, succId: string): Promise<boolean> {
    // Buscamos si el 'successor' tiene sus propios sucesores que cierren el círculo
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
   * Desvincula la tarea y limpia sus relaciones para que vuelva a ser "suelta".
   */
  async removeFromGantt(jobId: string) {
    await this.jobRepo.update(jobId, { inGantt: false });

    // Eliminamos dependencias donde participe esta tarea (como predecesor o sucesor)
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
