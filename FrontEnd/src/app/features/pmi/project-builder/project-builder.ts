import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 👈 Necesario para [(ngModel)] del form de hitos
import { ActivatedRoute } from '@angular/router';

// Modelos (Ajusta rutas si es necesario)
import { Job, JobAttachment } from '../../../shared/models/job';
import { ProjectService } from '../../../core/services/project';

@Component({
  selector: 'app-project-builder',
  standalone: true,
  imports: [CommonModule, FormsModule], // 👈 Importamos FormsModule aquí
  templateUrl: './project-builder.html',
})
export class ProjectBuilderComponent implements OnInit {
  // 💉 INYECCIÓN DE DEPENDENCIAS
  private projectService = inject(ProjectService);
  private route = inject(ActivatedRoute);

  // 1. ESTADO DE NAVEGACIÓN LOCAL
  public currentTab = signal<'overview' | 'tasks' | 'budgeting' | 'files'>('overview');

  // ==========================================
  // ESTADO Y MÉTODOS PARA EL CRUD DE HITOS
  // ==========================================

  public showMilestoneForm = signal<boolean>(false);
  public editingMilestoneId = signal<string | null>(null);

  // Guardará los datos temporales mientras el usuario escribe en el formulario
  public currentMilestone = signal<any>({
    nombre: '',
    fecha: '',
    estado: 'PENDIENTE',
  });

  /**
   * 📝 Abre el formulario para Crear o Editar un hito
   */
  openMilestoneForm(hito?: any) {
    if (hito) {
      this.editingMilestoneId.set(hito.id);
      // Formateamos la fecha para que el input type="date" la entienda (YYYY-MM-DD)
      const dateStr = new Date(hito.fecha).toISOString().split('T')[0];
      this.currentMilestone.set({ ...hito, fecha: dateStr });
    } else {
      // Prepara un formulario vacío para un nuevo hito
      this.editingMilestoneId.set(null);
      this.currentMilestone.set({
        nombre: '',
        fecha: new Date().toISOString().split('T')[0],
        estado: 'PENDIENTE',
      });
    }
    this.showMilestoneForm.set(true);
  }

  /**
   * ❌ Cierra el formulario de hitos
   */
  closeMilestoneForm() {
    this.showMilestoneForm.set(false);
    this.currentMilestone.set({});
  }

  /**
   * 💾 Guarda los cambios (Crear o Actualizar)
   */
  saveMilestone() {
    const data = this.currentMilestone();
    const isEditing = !!this.editingMilestoneId();

    // 🚧 AQUÍ DEBES LLAMAR A TU BACKEND (PmiController)
    // Ejemplo de cómo se vería la integración con tu ProjectService:
    /*
    if (isEditing) {
      this.projectService.updateMilestone(this.editingMilestoneId()!, data).subscribe(() => {
        // Recargar datos o actualizar estado local
      });
    } else {
      this.projectService.createMilestone(this.activeProject()!.id, data).subscribe(() => {
        // Recargar datos
      });
    }
    */

    console.log(isEditing ? 'Actualizando hito:' : 'Creando hito:', data);
    this.closeMilestoneForm();
  }

  /**
   * 🗑️ Elimina un hito
   */
  deleteMilestone(hito: any) {
    if (confirm(`¿Estás seguro de que deseas eliminar el hito "${hito.nombre}"?`)) {
      // 🚧 AQUÍ DEBES LLAMAR A TU BACKEND
      // Ej: this.projectService.deleteMilestone(hito.id).subscribe(...)
      console.log('Eliminando hito ID:', hito.id);
    }
  }

  // ==========================================
  // CONEXIÓN AL ESTADO GLOBAL (ProjectService)
  // ==========================================

  // 🔗 Conectamos directamente con el computed del servicio
  public activeProject = this.projectService.activeProject;

  // 👥 Trabajadores asignados al proyecto
  public projectWorkers = computed(() => {
    return this.activeProject()?.trabajadores || [];
  });

  // 📋 Lista de Trabajos/Tareas
  public projectJobs = computed(() => {
    return this.activeProject()?.trabajos || [];
  });

  // 📅 Fechas y Progreso del Proyecto
  public projectDates = computed(() => {
    const project = this.activeProject();
    return {
      inicio: project?.fechaInicio ? new Date(project.fechaInicio) : null,
      fin: project?.fechaFin ? new Date(project.fechaFin) : null,
      diasRestantes: this.calculateDaysLeft(project?.fechaFin),
    };
  });

  // 💰 Presupuesto (Soles)
  public projectBudget = computed(() => {
    const project = this.activeProject();
    return {
      total: project?.presupuesto || 0,
      gastado: 0, // Se queda en 0 temporalmente
      moneda: 'PEN',
    };
  });

  // 📂 Extracción de TODOS los documentos del proyecto
  public allDocuments = computed(() => {
    const jobs = this.projectJobs();
    let allFiles: { jobName: string; file: JobAttachment }[] = [];

    jobs.forEach((job: Job) => {
      job.adjuntos?.forEach((adjunto: JobAttachment) => {
        allFiles.push({ jobName: job.nombre, file: adjunto });
      });
    });

    return allFiles;
  });

  // 📊 Estadísticas de Almacenamiento
  public storageStats = computed(() => {
    const files = this.allDocuments();
    let totalBytes = 0;
    let driveLinksCount = 0;
    let physicalFilesCount = 0;

    files.forEach(({ file }) => {
      if (file.tipo === 'file') {
        totalBytes += file.size || 0;
        physicalFilesCount++;
      } else if (file.tipo === 'link' || file.url?.includes('drive.google.com')) {
        driveLinksCount++;
      }
    });

    const usedMB = Number((totalBytes / (1024 * 1024)).toFixed(2));
    const totalLimitMB = 200 * 1024; // Límite de 200 GB

    return {
      usedMB,
      percentage: Number(((usedMB / totalLimitMB) * 100).toFixed(2)),
      driveLinks: driveLinksCount,
      hasFiles: physicalFilesCount > 0,
      physicalFilesCount,
    };
  });

  // ==========================================
  // CICLO DE VIDA Y MÉTODOS DE UTILIDAD
  // ==========================================

  ngOnInit(): void {
    const routeId = this.route.snapshot.paramMap.get('id');

    if (this.projectService.userProjects().length === 0) {
      this.projectService.getAll().subscribe(() => {
        this.syncProjectFromUrl(routeId);
      });
    } else {
      this.syncProjectFromUrl(routeId);
    }
  }

  private syncProjectFromUrl(routeId: string | null) {
    if (routeId) {
      this.projectService.setSelectedProject(routeId);
    }
  }

  setTab(tab: 'overview' | 'tasks' | 'budgeting' | 'files') {
    this.currentTab.set(tab);
  }

  private calculateDaysLeft(endDate?: string | Date): number {
    if (!endDate) return 0;
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
  }

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
