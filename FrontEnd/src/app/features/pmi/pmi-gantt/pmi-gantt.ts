import { Component, OnInit, inject, effect, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

// 1. IMPORTACIONES PARA DRAG & DROP
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { ProjectService } from '../../../core/services/project';
import { GanttService } from '../../../core/services/gantt';
import { JobsService } from '../../../core/services/jobs';
import { TaskGanttDetailComponent } from '../../../shared/components/task-gantt-detail/task-gantt-detail';
import Gantt from 'frappe-gantt';

@Component({
  selector: 'app-pmi-gantt',
  standalone: true,
  // 2. INCLUIR DragDropModule EN LOS IMPORTS
  imports: [CommonModule, FormsModule, TaskGanttDetailComponent, DragDropModule],
  templateUrl: './pmi-gantt.html',
  styleUrl: './pmi-gantt.css',
})
export class PmiGanttComponent implements OnInit {
  public projectService = inject(ProjectService);
  private ganttService = inject(GanttService);
  private jobsService = inject(JobsService);

  @ViewChild('gantt_canvas', { static: false }) ganttCanvas!: ElementRef;

  public rawJobs: any[] = [];
  public selectedProjectId: string = '';
  public isLoading = false;
  public isModalOpen = false;
  public selectedJob: any = null;
  public currentMode: string = 'Day';
  public ganttInstance: any;

  constructor() {
    effect(() => {
      const id = this.projectService.selectedProjectId();
      if (id) {
        this.selectedProjectId = id;
        this.loadProjectData(id);
      }
    });
  }

  ngOnInit() {
    if (this.projectService.userProjects().length === 0) {
      this.projectService.loadProjects();
    }
  }

  /**
   * 🛰️ CARGA Y CRUCE DE DATOS
   */
  loadProjectData(id: string) {
    this.isLoading = true;
    this.ganttService.getGanttData(id).subscribe({
      next: (res) => {
        const jobs = res.jobs || [];
        const deps = res.dependencies || [];

        this.rawJobs = jobs.map((j: any) => {
          const myDeps = deps
            .filter((d: any) => String(d.successor?.id || d.successorId) === String(j.id))
            .map((d: any) => String(d.predecessor?.id || d.predecessorId));

          return {
            ...j,
            id: String(j.id),
            dependencies: myDeps,
            predecesoraId: myDeps.length > 0 ? myDeps[0] : null,
          };
        });

        setTimeout(() => this.renderGanttChart(), 100);
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.error('❌ Error cargando cronograma:', err);
      },
    });
  }

  /**
   * 🔄 GESTIÓN DE REORDENAMIENTO (DRAG & DROP)
   * Este método corrige el error TS2339 de 'onDropTask'
   */
  onDropTask(event: CdkDragDrop<any[]>) {
    // Reordenamos el array localmente
    moveItemInArray(this.rawJobs, event.previousIndex, event.currentIndex);

    // Opcional: Aquí podrías llamar a un servicio para guardar el nuevo orden
    // this.jobsService.updatePositions(this.rawJobs.map(j => j.id)).subscribe();

    // Volvemos a renderizar el Gantt para que refleje el nuevo orden visual
    this.renderGanttChart();
  }

  /**
   * 🛠️ ESCUCHA CAMBIOS DESDE EL MODAL
   * Este método corrige el error TS2339 de 'onOrderChanged'
   */
  onOrderChanged(newOrder: any[]) {
    if (newOrder && Array.isArray(newOrder)) {
      this.rawJobs = [...newOrder];
      this.renderGanttChart();
    }
  }

  // --- LÓGICA DEL GANTT ---

  renderGanttChart() {
    if (!this.ganttCanvas || this.rawJobs.length === 0) return;

    const tasks = this.rawJobs
      .filter((job) => job.inGantt && job.fechaInicio && job.fechaFin)
      .map((job) => ({
        id: job.id,
        name: job.nombre,
        start: this.formatDate(job.fechaInicio),
        end: this.formatDate(job.fechaFin),
        progress: this.calculateProgress(job.estado),
        dependencies: job.dependencies || [],
        custom_class: this.getBarClass(job.estado),
      }));

    if (tasks.length === 0) {
      // Si no hay tareas, limpiamos el contenedor
      if (this.ganttCanvas.nativeElement) this.ganttCanvas.nativeElement.innerHTML = '';
      return;
    }

    // Frappe Gantt a veces duplica el SVG, lo limpiamos si es necesario antes de crear una nueva instancia
    if (!this.ganttInstance && this.ganttCanvas.nativeElement) {
      this.ganttCanvas.nativeElement.innerHTML = '';
    }

    if (this.ganttInstance) {
      this.ganttInstance.refresh(tasks);
    } else {
      this.ganttInstance = new Gantt(this.ganttCanvas.nativeElement, tasks, {
        header_height: 50,
        column_width: 30,
        view_modes: ['Day', 'Week', 'Month'],
        language: 'es',
        bar_height: 30,
        padding: 18,
        on_click: (task: any) => {
          const job = this.rawJobs.find((j) => j.id === task.id);
          if (job) this.openTaskDetail(job);
        },
        on_date_change: (task: any, start: Date, end: Date) => {
          this.syncDateChange(task.id, start, end);
        },
      });
    }
  }

  private formatDate(date: any): string {
    return new Date(date).toISOString().split('T')[0];
  }

  private calculateProgress(estado: string): number {
    const p: Record<string, number> = { Done: 100, Reviewing: 80, 'In Progress': 50 };
    return p[estado] || 0;
  }

  private async syncDateChange(id: string, start: Date, end: Date) {
    try {
      const payload = {
        fechaInicio: start.toISOString(),
        fechaFin: end.toISOString(),
      };
      await firstValueFrom(this.jobsService.updateJob(id, payload));
      const job = this.rawJobs.find((j) => j.id === id);
      if (job) {
        job.fechaInicio = payload.fechaInicio;
        job.fechaFin = payload.fechaFin;
      }
    } catch (error) {
      this.loadProjectData(this.selectedProjectId);
    }
  }

  // --- MÉTODOS DE UI ---

  getStatusColor(estado: string): string {
    switch (estado) {
      case 'Done':
        return 'bg-emerald-500';
      case 'In Progress':
        return 'bg-sky-500';
      case 'Reviewing':
        return 'bg-amber-500';
      case 'To Do':
      case 'pending':
        return 'bg-slate-300 text-slate-600';
      default:
        return 'bg-slate-200';
    }
  }

  private getBarClass(estado: string): string {
    const classes: Record<string, string> = {
      Done: 'vox-bar-complete',
      'In Progress': 'vox-bar-running',
      Reviewing: 'vox-bar-review',
      'To Do': 'vox-bar-todo',
      pending: 'vox-bar-pending',
    };
    return classes[estado] || 'vox-bar-pending';
  }

  changeViewMode(mode: string) {
    this.currentMode = mode;
    if (this.ganttInstance) this.ganttInstance.change_view_mode(mode);
  }

  // --- GESTIÓN DE MODALES ---

  openTaskDetail(job: any) {
    this.selectedJob = { ...job };
    this.isModalOpen = true;
  }

  openAddJob() {
    this.selectedJob = {
      nombre: '',
      descripcion: '',
      estado: 'To Do',
      inGantt: true,
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaFin: new Date().toISOString().split('T')[0],
      trabajadores: [],
      proyectoId: this.selectedProjectId,
    };
    this.isModalOpen = true;
  }

  onTaskSave(updatedTask: any) {
    this.loadProjectData(this.selectedProjectId);
    this.isModalOpen = false;
  }

  onProjectChange(newId: string) {
    this.selectedProjectId = newId;
    this.projectService.setSelectedProject(newId);
  }
}
