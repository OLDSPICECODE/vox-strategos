import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  OnDestroy,
  effect,
  inject,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GanttService } from '../../../core/services/gantt';
import { ProjectService } from '../../../core/services/project';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pmi-gantt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pmi-gantt.html',
  styleUrl: './pmi-gantt.css',
})
export class PmiGanttComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('gantt_canvas', { static: true }) ganttElement!: ElementRef;

  public projectService = inject(ProjectService);
  private ganttService = inject(GanttService);
  private subs = new Subscription();

  public rawJobs: any[] = [];
  public isLoading = false;
  public viewModes: ('Day' | 'Week' | 'Month')[] = ['Day', 'Week', 'Month'];
  public currentMode: 'Day' | 'Week' | 'Month' = 'Day';

  get selectedProjectName() {
    return this.projectService.activeProject()?.nombre || 'PROYECTO ACTIVO';
  }

  constructor() {
    effect(() => {
      const id = this.projectService.selectedProjectId();
      if (id) this.loadData(id);
    });
  }

  ngOnInit(): void {
    if (this.projectService.userProjects().length === 0) {
      this.projectService.loadProjects();
    }
  }

  ngAfterViewInit(): void {
    // Dibujamos un placeholder si el diagrama no carga inmediatamente
    this.drawPlaceholder();
  }

  loadData(projectId: string): void {
    this.isLoading = true;
    this.subs.add(
      this.ganttService.getGanttData(projectId).subscribe({
        next: (data) => {
          this.rawJobs = (data.jobs || []).map((j) => ({ ...j, id: String(j.id) }));
          this.isLoading = false;
        },
        error: () => (this.isLoading = false),
      }),
    );
  }

  /**
   * Asegura que el SVG tenga contenido mínimo para ser visible
   */
  private drawPlaceholder() {
    if (this.ganttElement?.nativeElement) {
      // Dibujo básico para verificar que el mapa interactivo está vivo
      this.ganttElement.nativeElement.innerHTML = `
        <rect x="100" y="50" width="300" height="40" fill="#0ea5e9" rx="8" class="native-bar"></rect>
        <text x="120" y="75" fill="white" font-weight="bold" font-family="sans-serif">Cargando Cronograma...</text>
      `;
    }
  }

  changeViewMode(mode: 'Day' | 'Week' | 'Month') {
    this.currentMode = mode;
  }

  addMilestone() {
    console.log('Hito añadido');
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
