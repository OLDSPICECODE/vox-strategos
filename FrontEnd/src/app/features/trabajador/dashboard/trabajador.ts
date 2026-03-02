import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

import { SidebarComponent } from '../sidebar/sidebar';
import { JobsService } from '../../../core/services/jobs';
import { AuthService } from '../../../core/services/auth';
import { Job } from '../../../shared/models/job';
import { TaskDetailsModalComponent } from '../../../shared/components/task-details-modal/task-details-modal';

@Component({
  selector: 'app-trabajador',
  standalone: true,
  imports: [CommonModule, SidebarComponent, RouterOutlet, TaskDetailsModalComponent],
  templateUrl: './trabajador.html',
})
export class TrabajadorComponent implements OnInit {
  private jobsService = inject(JobsService);
  private authService = inject(AuthService);
  private router = inject(Router);

  public tasks = this.jobsService.tasks;
  public userName = signal<string>('Trabajador');
  public activeFilter = signal<string>('all');

  // 🚀 SIGNAL QUE CONTROLA EL MODAL
  public selectedTask = signal<Job | null>(null);

  /**
   * Determina si el usuario está en la raíz del dashboard del trabajador.
   * Utiliza toSignal para manejar el flujo de navegación de Angular.
   */
  isDashboardRoot = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(
        () =>
          this.router.url === '/dashboard/trabajador' ||
          this.router.url === '/dashboard/trabajador/',
      ),
    ),
    {
      initialValue:
        this.router.url === '/dashboard/trabajador' || this.router.url === '/dashboard/trabajador/',
    },
  );

  /**
   * Calcula las estadísticas de progreso para los indicadores visuales.
   */
  stats = computed(() => {
    const allTasks = this.tasks();
    const total = allTasks.length;
    if (total === 0) return { verde: 0, amarillo: 0, rojo: 0, totalCompletado: 0 };

    const done = (allTasks.filter((t) => t.estado === 'Done').length / total) * 100;
    const progress = (allTasks.filter((t) => t.estado === 'In Progress').length / total) * 100;
    const todo = (allTasks.filter((t) => t.estado === 'To Do').length / total) * 100;

    return { verde: done, amarillo: progress, rojo: todo, totalCompletado: Math.round(done) };
  });

  /**
   * Signal computado que filtra la lista de tareas según el filtro activo.
   * Resuelve el error de referencia en el HTML.
   */
  filteredTasks = computed(() => {
    const allTasks = this.tasks();
    const filterValue = this.activeFilter();

    if (filterValue === 'high') {
      return allTasks.filter((t) => t.prioridad === 'High' || t.prioridad === 'Urgent');
    }

    if (filterValue === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return allTasks.filter((t) => t.fechaFin?.toString().includes(today));
    }

    return allTasks;
  });

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.userName.set(user.nombreCompleto);
      this.jobsService.loadTasks(user.id);
    }
  }

  /**
   * Actualiza el filtro activo para las tareas.
   * @param priority Criterio de filtrado (all, high, today)
   */
  filterTasks(priority: string): void {
    this.activeFilter.set(priority);
  }

  // 🚀 MÉTODOS PARA EL MODAL
  openTaskDetails(job: Job): void {
    console.log('📡 Abriendo detalle técnico de Sedapar:', job.nombre);
    this.selectedTask.set(job);
  }

  closeTaskDetails(): void {
    this.selectedTask.set(null);
  }

  handleTaskSaved(): void {
    const user = this.authService.currentUser();
    if (user) this.jobsService.loadTasks(user.id);
    this.selectedTask.set(null);
  }

  /**
   * Maneja el cambio de estado con auditoría obligatoria.
   */
  // En trabajador.ts

  // Definimos el orden lógico del proceso técnico
  private readonly statusOrder: Record<string, number> = {
    'To Do': 1,
    'In Progress': 2,
    Done: 3,
  };

  onStatusChange(jobId: string, event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const newStatus = selectElement.value;

    // Buscamos la tarea actual para comparar los estados
    const currentTask = this.tasks().find((t) => t.id === jobId);
    if (!currentTask) return;

    const oldStatus = currentTask.estado;
    const user = this.authService.currentUser()?.nombreCompleto || 'Logis'; //

    // Determinamos si es un retroceso
    const isRegression = this.statusOrder[newStatus] < this.statusOrder[oldStatus];
    let comentario = 'Cambio de estado estándar.';

    if (isRegression) {
      const observation = prompt(
        `⚠️ RETROCESO DETECTADO: Está cambiando de ${oldStatus} a ${newStatus}. Ingrese el motivo técnico (Obligatorio):`,
      );

      if (!observation || observation.trim() === '') {
        alert(
          '❌ Error: Para retroceder un proceso en Sedapar es obligatorio registrar una justificación.',
        );
        // Revertimos el select al valor anterior
        selectElement.value = oldStatus;
        return;
      }
      comentario = observation;
    }

    // Enviamos a la BD (el backend ya guarda el log gracias a los cambios previos)
    this.jobsService.updateJobStatus(jobId, newStatus, user, comentario).subscribe({
      next: () =>
        console.log(`✅ ${isRegression ? 'Retroceso registrado' : 'Avance registrado'} con éxito`),
      error: (err) => {
        console.error('❌ Error en el servidor:', err);
        selectElement.value = oldStatus;
      },
    });
  }

  /**
   * Devuelve la paleta de colores oficial de Sedapar según el estado del Job.
   */
  getJobColorClass(estado: string): string {
    const status = estado?.toLowerCase() || '';

    switch (status) {
      case 'to do':
      case 'pendiente':
      case 'atrasado':
        return 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400';

      case 'in progress':
      case 'proceso':
      case 'en curso':
        return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400';

      case 'done':
      case 'completo':
      case 'finalizado':
        return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400';

      default:
        return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
    }
  }
}
