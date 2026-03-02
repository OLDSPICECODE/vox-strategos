import { Component, Input, Output, EventEmitter, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Job, JobAttachment } from '../../models/job';
import { JobsService, JobActivity } from '../../../core/services/jobs'; // Importamos la interfaz del service
import { AuthService } from '../../../core/services/auth';
import { TaskFormModalComponent } from '../task-form-modal/task-form-modal';

@Component({
  selector: 'app-task-details-modal',
  standalone: true,
  imports: [CommonModule, TaskFormModalComponent],
  templateUrl: './task-details-modal.html',
})
export class TaskDetailsModalComponent implements OnInit {
  @Input() task!: Job;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private jobsService = inject(JobsService);
  private authService = inject(AuthService);

  public isEditing = signal<boolean>(false);
  public isUploading = signal<boolean>(false);
  public uploadProgress = signal<number>(0); // Para feedback visual de archivos grandes

  // Signal para almacenar la actividad reciente de la BD
  public activities = signal<JobActivity[]>([]);

  ngOnInit(): void {
    if (this.task?.id) {
      this.syncTaskData(); // 🚀 Sincronización vital al cargar/refrescar
    }
  }

  /**
   * 🔄 Sincroniza la tarea con la BD para recuperar adjuntos y logs tras un F5
   */
  syncTaskData() {
    if (!this.task?.id) return;

    // Obtenemos la tarea completa (con sus adjuntos actualizados)
    this.jobsService.findOne(this.task.id).subscribe({
      next: (fullTask: Job) => {
        this.task = fullTask;
        this.refreshActivities();
      },
      error: (err: any) => console.error('❌ Error al sincronizar con Sedapar:', err),
    });
  }

  /**
   * 📜 Carga el historial de logs desde la base de datos
   */
  refreshActivities() {
    if (!this.task?.id) return;

    this.jobsService.getJobLogs(this.task.id).subscribe({
      next: (logs: JobActivity[]) => this.activities.set(logs),
      error: (err: any) => console.error('❌ Error al cargar logs:', err),
    });
  }

  /**
   * 📝 Registra una nueva actividad en la BD
   */
  private registerActivity(accion: string, descripcion: string, comentario: string = '') {
    const user = this.authService.currentUser()?.nombreCompleto || 'Sistema';

    const logData: Partial<JobActivity> = {
      usuario: user,
      accion: accion,
      descripcion: descripcion,
      comentario: comentario,
      fecha: new Date(),
    };

    this.jobsService.saveJobLog(this.task.id, logData).subscribe({
      next: () => this.refreshActivities(),
      error: (err: Error) => console.error('❌ Error Log:', err.message),
    });
  }

  /**
   * 🚀 SUBIDA DE ARCHIVOS (Maneja archivos grandes)
   */
  onFileSelected(event: Event) {
    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];
    if (!file) return;

    // Validación básica de tamaño (ej: 50MB) para evitar cuellos de botella innecesarios
    if (file.size > 50 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo permitido: 50MB');
      element.value = '';
      return;
    }

    const user = this.authService.currentUser()?.nombreCompleto || 'Usuario Técnico';
    this.isUploading.set(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('usuario', user);

    this.jobsService.uploadAttachment(this.task.id, formData).subscribe({
      next: (newAttachment: any) => {
        // En lugar de solo pushear, resincronizamos con la BD para asegurar persistencia
        this.syncTaskData();
        this.isUploading.set(false);
        element.value = '';
      },
      error: (err: Error) => {
        this.isUploading.set(false);
        alert('Error al subir archivo grande. Verifique su conexión.');
        console.error('❌ Error subida:', err);
      },
    });
  }

  /**
   * 🔗 VINCULACIÓN DE ENLACES EXTERNOS (Drive, etc.)
   */
  addExternalLink() {
    const url = prompt('Pegue el enlace de Google Drive o Recurso:');
    if (!url || !url.includes('http')) {
      if (url) alert('La URL no es válida.');
      return;
    }

    const nombre =
      prompt('Nombre del documento (Ej: Informe de Excavación):') || 'Documento Externo';
    const user = this.authService.currentUser()?.nombreCompleto || 'Usuario Técnico';

    const linkData = { nombre, url, usuario: user };

    this.jobsService.addLinkToJob(this.task.id, linkData).subscribe({
      next: () => {
        this.syncTaskData(); // 🚀 Refrescamos todo el objeto para que el link no "desaparezca"
        console.log('🔗 Link guardado permanentemente');
      },
      error: (err: Error) => console.error('❌ Error link:', err),
    });
  }

  onSaveSuccess() {
    this.isEditing.set(false);
    this.syncTaskData(); // Refrescamos tras editar
    this.saved.emit();
  }

  downloadAttachment(adjunto: JobAttachment): void {
    if (adjunto.tipo === 'link') {
      window.open(adjunto.url, '_blank');
      return;
    }

    this.jobsService.downloadFile(adjunto.url).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = adjunto.nombre;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => alert('El archivo no se pudo descargar del servidor.'),
    });
  }

  toggleEdit() {
    this.isEditing.update((v) => !v);
  }

  /**
   * 🔐 VALIDACIÓN DE PERMISOS
   * Soluciona el error TS2322 asegurando un retorno booleano estricto.
   */
  canEditTask(): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;

    // 1. Verificación de Rol (Devuelve boolean)
    const isAdmin = ['ADMIN', 'PMI'].includes(user.role);

    // 2. Verificación de Asignación
    // El "?? false" al final asegura que si trabajadores es null, el resultado sea false y no undefined
    const isAssigned = this.task.trabajadores?.some((t: any) => t.id === user.id) ?? false;

    return isAdmin || isAssigned;
  }
}
