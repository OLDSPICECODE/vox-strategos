// back-end/src/jobs/dto/create-job.dto.ts
export class CreateJobDto {
  nombre: string;
  descripcion: string;
  fechaFin: string;
  prioridad: string;
  projectId: string;
  trabajadorId: string;
}   