import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project } from '../auth/entities/project.entity';
import { User } from '../auth/entities/user.entity';
import { Resource } from '../auth/entities/resource.entity';

import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PmiService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Resource)
    private readonly resourceRepository: Repository<Resource>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 🏗️ CREACIÓN Y BÚSQUEDA DE PROYECTOS
   */
  async createProject(data: Partial<Project>): Promise<Project> {
    try {
      const newProject = this.projectRepository.create(data);
      return await this.projectRepository.save(newProject);
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al crear el proyecto en Sedapar DB.',
      );
    }
  }

  async findAllProjects(): Promise<Project[]> {
    return await this.projectRepository.find({
      relations: ['trabajadores', 'pmis'],
      order: { createdAt: 'DESC' },
    });
  }

  async findProjectById(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['trabajadores', 'pmis', 'trabajos', 'trabajos.logs'],
    });
    if (!project) throw new NotFoundException('Proyecto inexistente.');
    return project;
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    await this.projectRepository.update(id, data);
    return this.findProjectById(id);
  }

  /**
   * 📈 MÉTRICAS GLOBALES Y ESPECÍFICAS
   */
  async getGlobalMetrics() {
    const projects = await this.projectRepository.find();
    const totalBudget = projects.reduce(
      (acc, p) => acc + Number(p.presupuestoTotal || 0),
      0,
    );
    const executedBudget = projects.reduce(
      (acc, p) => acc + Number(p.presupuestoConsumido || 0),
      0,
    );

    return {
      totalBudget,
      executedBudget,
      totalProjects: projects.length,
      executionPercentage:
        totalBudget > 0 ? Math.round((executedBudget / totalBudget) * 100) : 0,
    };
  }

  async getMetricsByProject(projectId: string) {
    const project = await this.findProjectById(projectId);
    const total = Number(project.presupuestoTotal || 0);
    const consumido = Number(project.presupuestoConsumido || 0);

    const hitosCompletados =
      project.hitos?.filter((h) => h.estado === 'COMPLETO').length || 0;
    const totalHitos = project.hitos?.length || 0;

    return {
      id: project.id,
      nombre: project.nombre,
      status: project.estado,
      progress:
        totalHitos > 0 ? Math.round((hitosCompletados / totalHitos) * 100) : 0,
      milestones_completed: hitosCompletados,
      budget: {
        total,
        consumido,
        percent: total > 0 ? Math.round((consumido / total) * 100) : 0,
      },
      tasks_count: project.trabajos?.length || 0,
    };
  }

  /**
   * 👥 GESTIÓN DE PERSONAL (Corregido TS2554)
   */
  async assignStaffToProject(projectId: string, staffData: any, role: string) {
    await this.findProjectById(projectId);
    // Lógica para vincular IDs en tablas puente según el rol recibido
    return {
      success: true,
      message: `Personal con rol ${role} asignado correctamente.`,
    };
  }

  async getStaffStats() {
    return { totalWorkers: 0, activeProjects: 0 };
  }

  /**
   * 📂 ALMACENAMIENTO Y RECURSOS
   */
  async calculateStorageByProject(projectId: string) {
    const recursos = await this.resourceRepository.find({
      where: { project: { id: projectId } },
    });

    if (!recursos || recursos.length === 0) {
      return { used: 0, total: 200, unit: 'GB', filesByType: [] };
    }

    let totalBytes = 0;
    const extensionCounts: Record<string, number> = {};

    recursos.forEach((rec) => {
      if (rec.url) {
        const fullPath = path.resolve(process.cwd(), rec.url);
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          totalBytes += stats.size;
          const ext = path.extname(fullPath).toLowerCase().replace('.', '');
          if (ext) {
            extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
          }
        }
      }
    });

    return {
      used: parseFloat((totalBytes / 1024 ** 3).toFixed(4)),
      total: 200,
      unit: 'GB',
      filesByType: Object.keys(extensionCounts).map((ext) => ({
        extension: ext,
        cantidad: extensionCounts[ext],
        label: this.getLabelByExt(ext),
        icon: this.getIconByExt(ext),
      })),
    };
  }

  async getUploadsFolderSize(): Promise<number> {
    const uploadsPath = path.resolve(process.cwd(), 'uploads');
    let totalSize = 0;
    if (fs.existsSync(uploadsPath)) {
      const files = fs.readdirSync(uploadsPath);
      files.forEach((file) => {
        const stats = fs.statSync(path.join(uploadsPath, file));
        totalSize += stats.size;
      });
    }
    return totalSize;
  }

  /**
   * 📜 ACTIVIDAD E HITOS
   */
  async getRecentActivity(projectId: string) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['trabajos', 'trabajos.logs'],
    });

    if (!project || !project.trabajos) return [];

    const allLogs = project.trabajos.flatMap(
      (job) =>
        job.logs?.map((log) => ({
          id: log.id,
          task: job.nombre,
          usuario: log.usuario,
          accion: log.accion,
          fecha: log.fecha,
          type: this.mapActionToType(log.accion),
        })) || [],
    );

    return allLogs
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
      .slice(0, 10);
  }

  async addMilestoneToProject(projectId: string, milestone: any) {
    await this.findProjectById(projectId);
    return { ...milestone, status: 'PLANIFICADO' };
  }

  async getDetailedBudgetReport() {
    return { url: 'reports/budget-latest.pdf', generatedAt: new Date() };
  }

  // --- HELPERS PRIVADOS ---

  private getLabelByExt(ext: string): string {
    const labels = {
      dwg: 'Planos Técnicos',
      pdf: 'Documentación Legal',
      xlsx: 'Presupuestos/Cómputos',
      zip: 'Paquetes de Obra',
      png: 'Evidencias',
      jpg: 'Evidencias',
    };
    return labels[ext] || 'Otros Archivos';
  }

  private getIconByExt(ext: string): string {
    const icons = {
      dwg: 'architecture',
      pdf: 'description',
      xlsx: 'table_view',
      zip: 'inventory_2',
      png: 'image',
      jpg: 'image',
    };
    return icons[ext] || 'draft';
  }

  private mapActionToType(accion: string): string {
    if (accion.includes('COMPLETO')) return 'COMPLETED';
    if (accion.includes('SUBIDA') || accion.includes('SUBIO')) return 'UPLOAD';
    return 'PENDING';
  }
}
