import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../auth/entities/project.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async findByWorker(userId: string): Promise<Project[]> {
    const projects = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.trabajadores', 'workers')
      .leftJoinAndSelect('project.pmis', 'pmis')
      .leftJoinAndSelect('project.trabajos', 'jobs')
      .leftJoinAndSelect('jobs.trabajadores', 'jobWorkers')
      .leftJoinAndSelect('jobs.logs', 'logs')
      .leftJoinAndSelect('project.movimientos', 'payments')
      /** * 🛠️ CORRECCIÓN DE AMBIGÜEDAD:
       * Usamos "projectsId" que es el nombre real de la columna en tus tablas de unión Many-to-Many.
       */
      .where(
        'project.id IN (SELECT "projectsId" FROM "project_workers" WHERE "userId" = :userId)',
        { userId },
      )
      .orWhere(
        'project.id IN (SELECT "projectsId" FROM "project_pmis" WHERE "userId" = :userId)',
        { userId },
      )
      .getMany();

    return projects.map((project) => this.enrichProjectData(project));
  }

  async getProjectOverview(projectId: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: [
        'trabajos',
        'trabajadores',
        'pmis',
        'movimientos',
        'trabajos.trabajadores',
        'trabajos.adjuntos',
        'trabajos.logs',
      ],
    });

    if (!project) throw new NotFoundException('Proyecto no encontrado');

    return this.enrichProjectData(project);
  }

  private enrichProjectData(project: Project): Project {
    project.trabajos = project.trabajos || [];
    project.trabajadores = project.trabajadores || [];
    project.movimientos = project.movimientos || [];

    const totalJobs = project.trabajos.length;
    const doneJobs = project.trabajos.filter((j) => j.estado === 'Done').length;

    if (!project.progreso) {
      project.progreso =
        totalJobs > 0 ? Math.round((doneJobs / totalJobs) * 100) : 0;
    }

    project.estado = project.progreso === 100 ? 'Finalizado' : 'En curso';
    return project;
  }
}
