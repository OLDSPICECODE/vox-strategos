import { Component, Input, Output, EventEmitter, inject, OnInit, computed } from '@angular/core';
import { Component as NgComponent } from '@angular/core'; // Para evitar conflictos de nombres
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { JobsService } from '../../../core/services/jobs';
import { Job, JobStatus, JobPriority } from '../../models/job';

@NgComponent({
  selector: 'app-task-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './task-form-modal.html',
})
export class TaskFormModalComponent implements OnInit {
  // Recibimos los datos si es edición
  @Input() editData: Job | null = null; 
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private jobsService = inject(JobsService);

  /**
   * ✅ SOLUCIÓN AL ERROR: Definimos isEditing como una señal computada.
   * Si editData tiene algo, es verdadero (modo editar).
   */
  public isEditing = computed(() => !!this.editData);

  public taskForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: [''],
    estado: [JobStatus.TODO],
    prioridad: [JobPriority.MEDIUM],
    fechaInicio: [new Date().toISOString().split('T')[0], Validators.required],
    fechaFin: ['', Validators.required],
  });

  public priorityOptions = Object.values(JobPriority);

  ngOnInit(): void {
    if (this.editData) {
      this.taskForm.patchValue({
        nombre: this.editData.nombre,
        descripcion: this.editData.descripcion,
        estado: this.editData.estado,
        prioridad: this.editData.prioridad,
        fechaInicio: new Date(this.editData.fechaInicio).toISOString().split('T')[0],
        fechaFin: new Date(this.editData.fechaFin).toISOString().split('T')[0],
      });
    }
  }

  // src/app/shared/task-form-modal/task-form-modal.ts

onSubmit(): void {
  if (this.taskForm.invalid) return;
  const formData = this.taskForm.value;

  if (this.editData) {
    this.jobsService.updateJob(this.editData.id, formData).subscribe({
      next: () => {
        // 🚀 PRIMER PASO: Avisamos al padre que el guardado fue un éxito
        this.save.emit(); 
      },
      error: (err) => console.error('Error al actualizar:', err)
    });
  } else {
    this.jobsService.createJob(formData).subscribe({
      next: () => {
        // 🚀 También al crear
        this.save.emit(); 
      },
      error: (err) => console.error('Error al crear:', err)
    });
  }
}
}