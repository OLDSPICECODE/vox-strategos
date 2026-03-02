import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../../core/services/project';
import { JobsService } from '../../../core/services/jobs'; // 👈 Asegúrate de tener este servicio
import { Job, JobAttachment } from '../../../shared/models/job';

interface ProjectView {
  id: string;
  nombre: string;
  progreso: number;
  presupuestoConsumido: number;
  tasks_count: number;
  milestones_completed: number;
  total_milestones: number;
  trabajos: any[];
  trabajadores: any[];
  logs: any[]; // 👈 Nueva propiedad para la bitácora
}

@Component({
  selector: 'app-pmi-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class PmiDashboardComponent implements OnInit {
  private projectService = inject(ProjectService);
  private jobsService = inject(JobsService); // 👈 Inyectamos el servicio de trabajos

  // Signals reactivos
  public projects = this.projectService.userProjects;
  public selectedProjectId = this.projectService.selectedProjectId;

  // Signal para los logs globales del servidor
  private globalLogs = signal<any[]>([]);

  /**
   * 📉 PROYECTO ACTIVO ENRIQUECIDO
   */
  public activeProject = computed(() => {
    const project = this.projectService.activeProject();
    if (!project) return null;

    const view: ProjectView = {
      id: project.id,
      nombre: project.nombre,
      progreso: project.progreso || 0,
      presupuestoConsumido: project.presupuestoConsumido || 0,
      tasks_count: project.trabajos?.length || 0,
      milestones_completed: project.hitos?.filter((h: any) => h.estado === 'COMPLETO').length || 0,
      total_milestones: project.hitos?.length || 0,
      trabajos: project.trabajos || [],
      trabajadores: project.trabajadores || [],
      logs: project.logs || [],
    };

    return view;
  });

  /**
   * 📊 ESTADÍSTICAS GLOBALES (Dona Central)
   */
  public stats = computed(() => {
    const jobs = this.activeProject()?.trabajos || [];
    const total = jobs.length || 1;

    // Normalización de estados (backend usa mayúsculas)
    const completed = jobs.filter((j) => ['DONE', 'Done', 'COMPLETO'].includes(j.estado)).length;
    const inProgress = jobs.filter((j) => ['IN_PROGRESS', 'In Progress'].includes(j.estado)).length;
    const pending = jobs.filter((j) =>
      ['TODO', 'PENDING', 'pending', 'To Do'].includes(j.estado),
    ).length;

    return {
      done: Math.round((completed / total) * 100),
      doing: Math.round((inProgress / total) * 100),
      todo: Math.round((pending / total) * 100),
      totalJobs: jobs.length,
    };
  });

  /**
   * 👷 DISTRIBUCIÓN POR TRABAJADOR
   */
  public workerDistribution = computed(() => {
    const project = this.activeProject();
    if (!project || !project.trabajadores) return [];

    return project.trabajadores.map((worker) => {
      const workerJobs =
        project.trabajos?.filter((job) => job.trabajadores?.some((t: any) => t.id === worker.id)) ||
        [];

      const total = workerJobs.length || 1;
      const done = workerJobs.filter((j) => ['DONE', 'COMPLETO', 'Done'].includes(j.estado)).length;
      const doing = workerJobs.filter((j) =>
        ['IN_PROGRESS', 'In Progress'].includes(j.estado),
      ).length;
      const todo = workerJobs.filter((j) =>
        ['TODO', 'PENDING', 'pending'].includes(j.estado),
      ).length;

      const overdue = workerJobs.filter(
        (j) =>
          !['DONE', 'COMPLETO'].includes(j.estado) &&
          j.fechaFin &&
          new Date(j.fechaFin) < new Date(),
      ).length;

      return {
        nombre: worker.nombreCompleto,
        cargo: worker.cargo || 'Técnico Especialista',
        totalTasks: workerJobs.length,
        pDone: (done / total) * 100,
        pDoing: (doing / total) * 100,
        pTodo: (todo / total) * 100,
        statusLabel: overdue > 0 ? `${overdue} con retraso` : 'Al día',
        isOverdue: overdue > 0,
      };
    });
  });

  /**
   * 📜 BITÁCORA DE ACTIVIDAD (Corregida para usar logs globales)
   * Prioriza los logs que vienen con la relación 'job' del backend.
   */
  public recentActivity = computed(() => {
    // Si tenemos logs globales (con nombre de trabajo), los usamos.
    // Si no, recurrimos a los logs del proyecto activo.
    const logs =
      this.globalLogs().length > 0 ? this.globalLogs() : this.activeProject()?.logs || [];

    return [...logs]
      .sort(
        (a, b) =>
          new Date(b.fecha || b.createdAt).getTime() - new Date(a.fecha || a.createdAt).getTime(),
      )
      .slice(0, 6); // Mostramos 6 para llenar mejor el espacio
  });

  /**
   * 🎨 GRADIENTE DE LA DONA
   */
  public chartGradient = computed(() => {
    const s = this.stats();
    if (s.totalJobs === 0) return '#f8fafc';
    return `conic-gradient(#10b981 0% ${s.done}%, #0ea5e9 ${s.done}% ${s.done + s.doing}%, #fb7185 ${s.done + s.doing}% 100%)`;
  });

  public storage = signal({ used: 0.5, total: 200, filesByType: [] });

  async ngOnInit() {
    this.projectService.loadProjects();
    await this.loadActivityLogs();
  }

  /**
   * Carga los logs desde el nuevo endpoint del backend
   */
  private async loadActivityLogs() {
    try {
      const logs = await this.jobsService.getGlobalLogs();
      this.globalLogs.set(logs);
    } catch (error) {
      console.error('Error cargando bitácora de Sedapar:', error);
    }
  }

  public selectProject(id: string) {
    this.projectService.setSelectedProject(id);
    // Opcional: Recargar logs específicos al cambiar proyecto
    this.loadActivityLogs();
  }
  /**
   * 🎨 DETERMINA EL TIPO DE ARCHIVO PARA LA UI
   */
  getFileTypeInfo(fileName: string) {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    const types: any = {
      pdf: { icon: 'picture_as_pdf', color: 'text-rose-500', bg: 'bg-rose-50' },
      xlsx: { icon: 'table_view', color: 'text-emerald-500', bg: 'bg-emerald-50' },
      xls: { icon: 'table_view', color: 'text-emerald-500', bg: 'bg-emerald-50' },
      csv: { icon: 'table_view', color: 'text-emerald-500', bg: 'bg-emerald-50' },
      doc: { icon: 'description', color: 'text-sky-500', bg: 'bg-sky-50' },
      docx: { icon: 'description', color: 'text-sky-500', bg: 'bg-sky-50' },
      png: { icon: 'image', color: 'text-amber-500', bg: 'bg-amber-50' },
      jpg: { icon: 'image', color: 'text-amber-500', bg: 'bg-amber-50' },
    };

    return types[ext] || { icon: 'draft', color: 'text-slate-400', bg: 'bg-slate-50' };
  }

  /**
   * 💾 CÁLCULO DE ALMACENAMIENTO REAL
   * Basado en los recursos (archivos) vinculados al proyecto activo.
   */
  public storageStats = computed(() => {
    const project = this.activeProject();

    // 🛡️ Estado inicial si no hay data
    if (!project || !project.trabajos) {
      return { usedMB: 0, percentage: 0, driveLinks: 0, hasFiles: false };
    }

    let totalBytes = 0;
    let driveLinksCount = 0;
    let fileCount = 0;

    // 🔄 Recorremos los trabajos del proyecto de Sedapar
    project.trabajos.forEach((job: Job) => {
      job.adjuntos?.forEach((adjunto: JobAttachment) => {
        // 📂 Lógica para Archivos Físicos
        if (adjunto.tipo === 'file') {
          totalBytes += adjunto.size || 0;
          fileCount++;
        }

        // 🔗 Lógica para Links (Drive, SharePoint, etc.)
        if (adjunto.tipo === 'link' || adjunto.url?.includes('drive.google.com')) {
          driveLinksCount++;
        }
      });
    });

    // Convertimos a MB con 2 decimales
    const usedMB = Number((totalBytes / (1024 * 1024)).toFixed(2));

    // Calculamos el porcentaje sobre el límite de 200GB (204800 MB)
    const totalLimitMB = 200 * 1024;
    const percentage = Number(((usedMB / totalLimitMB) * 100).toFixed(2));

    return {
      usedMB,
      percentage,
      driveLinks: driveLinksCount,
      hasFiles: fileCount > 0,
    };
  });
}
