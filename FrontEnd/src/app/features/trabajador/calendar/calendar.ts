import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobsService } from '../../../core/services/jobs';
import { AuthService } from '../../../core/services/auth';
import { Job } from '../../../shared/models/job';
import { CreateTaskModalComponent } from '../../../shared/components/create-task-modal/create-task-modal';
import { TaskDetailsModalComponent } from '../../../shared/components/task-details-modal/task-details-modal';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, CreateTaskModalComponent, TaskDetailsModalComponent],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class CalendarComponent implements OnInit {
  private jobsService = inject(JobsService);
  private authService = inject(AuthService);

  // --- CONFIGURACIÓN DE FILTROS ---
  // Define aquí los estados que NO deben mostrarse en el calendario
  private readonly COMPLETED_STATUS = ['done', 'completo', 'completado', 'finalizado'];

  // ESTADOS REACTIVOS
  viewMode = signal<'month' | 'week' | 'day'>('month');
  currentDate = signal(new Date());
  selectedDay = signal<number>(new Date().getDate());
  realTasks = signal<Job[]>([]);

  // CONTROL DE MODALES
  showCreateModal = signal<boolean>(false);
  selectedTask = signal<Job | null>(null);

  // Tareas filtradas para el panel lateral (Día seleccionado + No completadas)
  selectedDayTasks = computed(() => {
    const day = this.selectedDay();
    if (!day) return [];
    return this.getTasksForDay(day);
  });

  weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  calendarDays = computed(() => {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    return [
      ...Array(firstDayIndex).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
  });

  ngOnInit() {
    this.refreshCalendarData();
  }

  // NAVEGACIÓN
  changeView(mode: 'month' | 'week' | 'day') {
    this.viewMode.set(mode);
    this.refreshCalendarData();
  }

  goToToday() {
    const today = new Date();
    this.currentDate.set(today);
    this.selectedDay.set(today.getDate());
    this.refreshCalendarData();
  }

  // LÓGICA DE DATOS
  refreshCalendarData() {
    const user = this.authService.currentUser();
    if (!user) return;

    const { start, end } = this.calculateDateRange();
    this.jobsService.getCalendarTasks(user.id, start, end).subscribe({
      next: (tasks: Job[]) => this.realTasks.set(tasks),
      error: (err) => console.error('❌ Error en el calendario de Sedapar:', err),
    });
  }

  private calculateDateRange() {
    const date = new Date(this.currentDate());
    let start: string, end: string;

    if (this.viewMode() === 'month') {
      start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
      end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();
    } else if (this.viewMode() === 'week') {
      const diff = date.getDate() - date.getDay();
      start = new Date(date.setDate(diff)).toISOString();
      end = new Date(date.setDate(diff + 6)).toISOString();
    } else {
      start = new Date(date.setHours(0, 0, 0, 0)).toISOString();
      end = new Date(date.setHours(23, 59, 59, 999)).toISOString();
    }
    return { start, end };
  }

  /**
   * Filtra las tareas por fecha Y por estado (Excluye completadas)
   */
  getTasksForDay(day: number | null): Job[] {
    if (!day) return [];

    const year = this.currentDate().getFullYear();
    const month = this.currentDate().getMonth();
    const calendarDay = Date.UTC(year, month, day);

    return this.realTasks().filter((task) => {
      // 1. Filtro de fecha
      const start = new Date(task.fechaInicio);
      const end = new Date(task.fechaFin);
      const taskStart = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
      const taskEnd = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
      const isInDateRange = calendarDay >= taskStart && calendarDay <= taskEnd;

      // 2. Filtro de estado (Excluir trabajos terminados)
      // Usamos .toLowerCase() para evitar problemas de mayúsculas/minúsculas
      const isNotDone = !this.COMPLETED_STATUS.includes(task.estado?.toLowerCase() || '');

      return isInDateRange && isNotDone;
    });
  }

  /**
   * Retorna las clases de Tailwind según el estado de la tarea
   */
  getTaskColorClass(estado: string): string {
    const status = estado?.toLowerCase().trim() || '';

    // 1. ROJO: Críticos o Atrasados
    if (['urgente', 'atrasado', 'critico', 'parado', 'to do'].includes(status)) {
      return 'bg-rose-100 text-rose-700 border-rose-400 dark:bg-rose-900/30 dark:text-rose-400';
    }

    // 2. AMARILLO: En Proceso
    if (['proceso', 'asignado', 'revision', 'en curso', 'in progress'].includes(status)) {
      return 'bg-amber-100 text-amber-700 border-amber-400 dark:bg-amber-900/30 dark:text-amber-400';
    }

    // 3. VERDE: Completados (Importante para que se vea el cambio)
    if (['done', 'completo', 'finalizado', 'terminado'].includes(status)) {
      return 'bg-emerald-100 text-emerald-700 border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-400';
    }

    // 4. AZUL: Por defecto (Pendientes generales)
    return 'bg-blue-100 text-blue-700 border-blue-400 dark:bg-blue-900/30 dark:text-blue-400';
  }
  // ACCIONES DE DÍA Y MODALES
  onDayClick(day: number) {
    this.selectedDay.set(day);
  }

  openTaskDetails(task: Job): void {
    this.selectedTask.set(task);
  }

  closeTaskDetails(): void {
    this.selectedTask.set(null);
  }

  openCreateModal(event: MouseEvent, day: number) {
    event.stopPropagation();
    this.selectedDay.set(day);
    this.showCreateModal.set(true);
  }

  handleTaskSaved(): void {
    this.showCreateModal.set(false);
    this.selectedTask.set(null);
    this.refreshCalendarData();
  }
}
