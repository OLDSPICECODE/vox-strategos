import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project } from '../../../shared/models/project';
import { Job } from '../../../shared/models/job';

@Component({
  selector: 'app-project-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-details-modal.html',
})
export class ProjectDetailsModalComponent {
  @Input() project!: Project;
  @Output() close = new EventEmitter<void>();
  
  /**
   * 🚀 Emisor para abrir el detalle de una tarea específica
   */
  @Output() openJobDetail = new EventEmitter<Job>();

  /**
   * Formatea montos para el presupuesto de Sedapar (PEN)
   */
  formatCurrency(amount: number | undefined): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(amount ?? 0);
  }

  /**
   * Calcula los días restantes para el cierre del proyecto
   */
  getDaysToPhase(): number {
    if (!this.project?.fechaFin) return 0;
    const end = new Date(this.project.fechaFin);
    const diff = end.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  }
}