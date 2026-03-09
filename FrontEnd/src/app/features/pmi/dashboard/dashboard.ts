import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../../core/services/project';
import { JobsService } from '../../../core/services/jobs'; // Asegúrate de tener este servicio
import { Job, JobAttachment } from '../../../shared/models/job';

interface ProjectView {
  id: string;
  nombre: string;
  progreso: number;
  presupuesto: number; // 👈 Presupuesto base asignado por Sedapar
  presupuestoConsumido: number; // 👈 Gasto real validado
  tasks_count: number;
  milestones_completed: number;
  total_milestones: number;
  trabajos: any[];
  trabajadores: any[];
  logs: any[];
}

@Component({
  selector: 'app-pmi-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'], // Si no usas CSS externo, puedes quitar esta línea
})
export class PmiDashboardComponent implements OnInit {
  private projectService = inject(ProjectService);
  private jobsService = inject(JobsService);

  // Signals reactivos globales
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

    // 🧮 CÁLCULO DINÁMICO DEL PRESUPUESTO CONSUMIDO
    // Sumamos solo las 'SALIDAS' que han sido explícitamente 'aceptadas'
    let consumido = 0;
    if (project.movimientos && Array.isArray(project.movimientos)) {
      consumido = project.movimientos
        .filter((mov: any) => mov.tipo === 'SALIDA' && mov.aceptado === true)
        .reduce((total: number, mov: any) => total + Number(mov.monto), 0);
    }

    const view: ProjectView = {
      id: project.id,
      nombre: project.nombre,
      progreso: project.progreso || 0,
      presupuesto: project.presupuestoTotal || 0,
      presupuestoConsumido: consumido,
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

    // Normalización de estados
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
        nombre: worker.nombreCompleto || worker.nombre, // Ajustado por si usas solo 'nombre'
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
   * 📜 BITÁCORA DE ACTIVIDAD
   */
  public recentActivity = computed(() => {
    const logs =
      this.globalLogs().length > 0 ? this.globalLogs() : this.activeProject()?.logs || [];

    return [...logs]
      .sort(
        (a, b) =>
          new Date(b.fecha || b.createdAt).getTime() - new Date(a.fecha || a.createdAt).getTime(),
      )
      .slice(0, 6);
  });

  /**
   * 🎨 GRADIENTE DE LA DONA
   */
  public chartGradient = computed(() => {
    const s = this.stats();
    if (s.totalJobs === 0) return '#f8fafc';
    return `conic-gradient(#10b981 0% ${s.done}%, #0ea5e9 ${s.done}% ${s.done + s.doing}%, #fb7185 ${s.done + s.doing}% 100%)`;
  });

  /**
   * 💾 CÁLCULO DE ALMACENAMIENTO REAL
   * Basado en los recursos (archivos y links) vinculados al proyecto activo.
   */
  public storageStats = computed(() => {
    const project = this.activeProject();

    if (!project || !project.trabajos) {
      return { usedMB: 0, percentage: 0, driveLinks: 0, hasFiles: false };
    }

    let totalBytes = 0;
    let driveLinksCount = 0;
    let fileCount = 0;

    project.trabajos.forEach((job: Job) => {
      job.adjuntos?.forEach((adjunto: JobAttachment) => {
        // Archivos Físicos
        if (adjunto.tipo === 'file') {
          totalBytes += adjunto.size || 0;
          fileCount++;
        }
        // Links Externos o de Google Drive
        if (adjunto.tipo === 'link' || adjunto.url?.includes('drive.google.com')) {
          driveLinksCount++;
        }
      });
    });

    const usedMB = Number((totalBytes / (1024 * 1024)).toFixed(2));
    const totalLimitMB = 200 * 1024; // Límite de servidor de 200GB
    const percentage = Number(((usedMB / totalLimitMB) * 100).toFixed(2));

    return {
      usedMB,
      percentage,
      driveLinks: driveLinksCount,
      hasFiles: fileCount > 0,
    };
  });

  // ==========================================
  // CICLO DE VIDA Y MÉTODOS PÚBLICOS
  // ==========================================

  async ngOnInit() {
    this.projectService.loadProjects();
    await this.loadActivityLogs();
  }

  private async loadActivityLogs() {
    try {
      const logs = await this.jobsService.getGlobalLogs();
      this.globalLogs.set(logs);
    } catch (error) {
      console.error('Error cargando bitácora:', error);
    }
  }

  public selectProject(id: string) {
    this.projectService.setSelectedProject(id);
    this.loadActivityLogs();
  }

  /**
   * 🎨 DETERMINA EL TIPO DE ARCHIVO PARA LA UI
   */
  getFileTypeInfo(fileName: string) {
    if (!fileName) return { icon: 'draft', color: 'text-slate-400', bg: 'bg-slate-50' };
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    const types: Record<string, { icon: string; color: string; bg: string }> = {
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
}
