import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

// Importaciones para el movimiento de tareas (Drag & Drop)
import { 
  CdkDragDrop, 
  moveItemInArray, 
  DragDropModule 
} from '@angular/cdk/drag-drop';

import { JobsService } from '../../../core/services/jobs';
import { UserService } from '../../../core/services/user';

@Component({
  selector: 'app-task-gantt-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './task-gantt-detail.html',
  styleUrls: ['./task-gantt-detail.css'], // Asegúrate de tener las animaciones CDK aquí
})
export class TaskGanttDetailComponent implements OnInit {
  private jobsService = inject(JobsService);
  private userService = inject(UserService);

  // --- INPUTS Y OUTPUTS ---
  @Input() task: any; 
  @Input() allTasks: any[] = []; 
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();
  @Output() orderChanged = new EventEmitter<any[]>(); // Notifica el nuevo orden

  // --- ESTADO DEL COMPONENTE ---
  editedTask: any = { 
    trabajadores: [], 
    adjuntos: [], 
    predecesoraId: null,
    tipoDependencia: 'FS' 
  };
  
  originalTask: any = {};
  dbUsers: any[] = [];
  sucesoras: any[] = [];
  activeTab: 'general' | 'recursos' | 'gantt' = 'general';
  isLoading = false;

  async ngOnInit() {
    if (!this.task) return;

    // Clonación profunda para no afectar el Gantt hasta guardar
    this.originalTask = JSON.parse(JSON.stringify(this.task));

    // 🔗 Lógica de reconstrucción de dependencias
    const rels = this.task.predecesoras || [];
    const firstRel = rels.length > 0 ? rels[0] : null;

    const initialPredecesoraId = firstRel 
      ? (firstRel.predecessorId || firstRel.predecessor?.id)
      : (this.task.predecesoraId || null);
    
    const initialType = firstRel?.type || 'FS';

    // Mapeo inicial de datos al formulario
    this.editedTask = {
      ...this.originalTask,
      predecesoraId: initialPredecesoraId ? String(initialPredecesoraId) : null,
      tipoDependencia: initialType,
      trabajadores: Array.isArray(this.task.trabajadores) ? [...this.task.trabajadores] : [],
      adjuntos: Array.isArray(this.task.adjuntos) ? [...this.task.adjuntos] : [],
      fechaInicio: this.formatDateForInput(this.task.fechaInicio),
      fechaFin: this.formatDateForInput(this.task.fechaFin),
    };

    this.calculateSucesoras();
    await this.loadUsers();
  }

  // --- MÉTODOS DE SEGURIDAD (ANTIERRORES) ---

  /**
   * 🛡️ Evita el error 'charAt' si el nombre es undefined o null
   */
  getInitials(name: string | null | undefined): string {
    if (!name || typeof name !== 'string') return '?';
    return name.trim().charAt(0).toUpperCase();
  }

  private formatDateForInput(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  }

  /**
   * Valida el cambio de pestañas para evitar errores de tipo string
   */
  setTab(tab: string) {
    if (tab === 'general' || tab === 'recursos' || tab === 'gantt') {
      this.activeTab = tab;
    }
  }

  // --- LÓGICA DE DRAG & DROP (MOVIMIENTO ARRIBA/ABAJO) ---

  /**
   * Reordena las tareas estéticamente y emite el cambio
   */
  onDropTask(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.allTasks, event.previousIndex, event.currentIndex);
    this.orderChanged.emit(this.allTasks);
    // Opcional: Persistir el nuevo orden en backend aquí
  }

  // --- GESTIÓN DE RECURSOS ---

  async loadUsers() {
    try {
      const users = await firstValueFrom(this.userService.findAll());
      this.dbUsers = users || [];
    } catch (e) {
      console.error('Error al cargar usuarios:', e);
      this.dbUsers = [];
    }
  }

  addWorker(userId: string) {
    if (!userId) return;
    const selectedUser = this.dbUsers.find(u => String(u.id) === String(userId));
    if (selectedUser && !this.editedTask.trabajadores.some((t: any) => t.id === selectedUser.id)) {
      this.editedTask.trabajadores.push({ ...selectedUser });
    }
  }

  removeWorker(workerId: string) {
    this.editedTask.trabajadores = this.editedTask.trabajadores.filter((t: any) => t.id !== workerId);
  }

  // --- LÓGICA DE RED Y GANTT ---

  private calculateSucesoras() {
    this.sucesoras = this.allTasks.filter(t => 
      t.predecesoras?.some((p: any) => 
        String(p.predecessorId || p.predecessor?.id) === String(this.task.id)
      )
    );
  }

  // --- GUARDADO FINAL ---

  async confirmSave() {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const patchPayload: any = {
        nombre: this.editedTask.nombre,
        descripcion: this.editedTask.descripcion,
        fechaInicio: new Date(this.editedTask.fechaInicio + 'T12:00:00').toISOString(),
        fechaFin: new Date(this.editedTask.fechaFin + 'T12:00:00').toISOString(),
        trabajadores: this.editedTask.trabajadores.map((t: any) => ({ id: t.id })),
        predecesoraId: this.editedTask.predecesoraId || null,
        dependencyType: this.editedTask.tipoDependencia // Sincronizado con Backend PDM
      };

      const res: any = await firstValueFrom(this.jobsService.updateJob(this.task.id, patchPayload));

      // Mapeo de vuelta para que el Gantt se actualice sin recargar página
      const taskForGantt = {
        ...this.task,
        ...res,
        id: String(this.task.id),
        name: res.nombre,
        start: this.formatDateForInput(res.fechaInicio),
        end: this.formatDateForInput(res.fechaFin),
        dependencies: res.predecesoras?.map((d: any) => String(d.predecessorId || d.predecessor?.id)) || []
      };

      this.save.emit(taskForGantt);
      this.closeModal();
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('No se pudo guardar la tarea. Revisa la conexión.');
    } finally {
      this.isLoading = false;
    }
  }

  closeModal() {
    this.close.emit();
  }

  downloadFile(adjunto: any) {
    if (!adjunto.url) return;
    this.jobsService.downloadFile(adjunto.url).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = adjunto.nombre || 'archivo';
      a.click();
    });
  }
}