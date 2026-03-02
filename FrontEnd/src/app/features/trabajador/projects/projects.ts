import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProjectService } from '../../../core/services/project';
import { Project } from '../../../shared/models/project';
import { Job } from '../../../shared/models/job';
import { TaskDetailsModalComponent } from '../../../shared/components/task-details-modal/task-details-modal';
import { ProjectDetailsModalComponent } from '../../../shared/components/project-details-modal/project-details-modal';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, TaskDetailsModalComponent, ProjectDetailsModalComponent],
  templateUrl: './projects.html',
  styles: [`
    .project-card { transition: all 0.3s ease; }
    .task-item-btn:active { transform: scale(0.98); }
  `],
})
export class ProjectsComponent implements OnInit {
  private projectService = inject(ProjectService);
  private router = inject(Router);

  public projects = computed<Project[]>(() => this.projectService.userProjects());
  public selectedTask = signal<Job | null>(null);
  public selectedProject = signal<Project | null>(null);
  public isLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.refreshProjects();
  }

  refreshProjects(): void {
    this.isLoading.set(true);
    this.projectService.loadProjects();
    setTimeout(() => this.isLoading.set(false), 600);
  }

  // --- GESTIÓN DE PROYECTOS ---
  openProjectOverview(project: Project): void {
    this.selectedProject.set(project);
  }

  closeProjectOverview(): void {
    this.selectedProject.set(null);
  }

  /**
   * 🚀 SOLUCIÓN AL ERROR TS2339:
   * Este método conecta el modal de Proyecto con el de Tareas.
   */
  handleOpenJobFromProject(job: Job): void {
    this.selectedTask.set(job);
  }

  // --- GESTIÓN DE TAREAS ---
  openTaskDetails(job: Job): void {
    this.selectedTask.set(job);
  }

  closeTaskDetails(): void {
    this.selectedTask.set(null);
  }

  handleTaskSaved(): void {
    this.projectService.loadProjects();
    this.selectedTask.set(null);
  }

  getProjectProgress(project: Project): number {
    if (!project.trabajos || project.trabajos.length === 0) return 0;
    const completed = project.trabajos.filter((t) => t.estado === 'Done').length;
    return Math.round((completed / project.trabajos.length) * 100);
  }
}