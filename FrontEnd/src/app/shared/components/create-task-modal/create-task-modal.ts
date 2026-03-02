import { Component, inject, signal, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { UserRole } from '../../models/user-role.enum';
import { JobPriority } from '../../models/job'; // 🚀 Importante: Importar el Enum
import { AuthService } from '../../../core/services/auth';
import { JobsService } from '../../../core/services/jobs';
import { ProjectService } from '../../../core/services/project';

@Component({
  selector: 'app-create-task-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-task-modal.html'
})
export class CreateTaskModalComponent implements OnInit {
  private authService = inject(AuthService);
  private jobsService = inject(JobsService);
  private projectService = inject(ProjectService);

  @Output() close = new EventEmitter<void>();
  @Output() taskCreated = new EventEmitter<void>();

  UserRole = UserRole;
  currentUser = this.authService.currentUser;
  projects = this.projectService.userProjects;

  // Formulario con valores iniciales
  taskForm = {
    nombre: '',
    descripcion: '',
    fechaFin: '',
    prioridad: 'Medium', // Se maneja como string en el input HTML
    projectId: '',
    trabajadorId: ''
  };

  ngOnInit() {
    if (this.projects().length === 0) {
      this.projectService.loadProjects();
    }

    const user = this.currentUser();
    if (user) {
      this.taskForm.trabajadorId = user.id;
    }
  }

  submitTask() {
    // Validaciones básicas antes de enviar a Sedapar
    if (!this.taskForm.nombre || !this.taskForm.fechaFin || !this.taskForm.projectId) {
      console.warn('⚠️ Datos incompletos: Asegúrate de seleccionar un proyecto.');
      return;
    }

    /**
     * 🛠️ FIX TS2345: Mapeo de datos
     * Creamos un objeto que cumpla con la interfaz Partial<Job>
     */
    const payload = {
      ...this.taskForm,
      prioridad: this.taskForm.prioridad as JobPriority // 👈 El "cast" que soluciona el error
    };

    this.jobsService.createJob(payload).subscribe({
      next: () => {
        this.taskCreated.emit();
        this.close.emit();
      },
      error: (err: any) => {
        console.error('❌ Error al crear tarea en Sedapar:', err);
      }
    });
  }
}