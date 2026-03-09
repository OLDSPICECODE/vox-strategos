import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, tap } from 'rxjs/operators';
import { Job } from '../../shared/models/job';

// Definición estricta de los estados que acepta PostgreSQL
export type JobStatusDB = 'pending' | 'To Do' | 'In Progress' | 'Reviewing' | 'Done';

export interface GanttUpdateDto {
  id: string;
  nombre?: string;
  descripcion?: string;
  estado?: JobStatusDB;
  fechaInicio?: Date | string | null;
  fechaFin?: Date | string | null;
  inGantt?: boolean;
  predecesoraId?: string | null;
  trabajadores?: { id: string }[];
}

export interface GanttDataResponse {
  jobs: Job[];
  dependencies: any[];
}

@Injectable({
  providedIn: 'root',
})
export class GanttService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/jobs`;

  /**
   * 📊 Obtiene la data completa para renderizar el Gantt
   */
  getGanttData(projectId: string): Observable<GanttDataResponse> {
    return this.http
      .get<GanttDataResponse>(`${this.API_URL}/project/${projectId}/gantt`)
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * 🚀 Actualización Individual
   * Usado por el Modal de Detalles para guardar cambios específicos.
   */
  updateJob(jobId: string, payload: Partial<GanttUpdateDto>): Observable<Job> {
    // Si el payload contiene un estado en español, aquí podrías interceptarlo
    // pero lo ideal es que ya venga limpio desde el componente.
    return this.http.patch<Job>(`${this.API_URL}/${jobId}`, payload).pipe(
      tap((res) => console.log(`✅ Job ${jobId} actualizado satisfactoriamente`)),
      catchError(this.handleError),
    );
  }

  /**
   * 🚜 Actualización Masiva (Batch)
   * Se dispara automáticamente al arrastrar o redimensionar barras en Frappe Gantt.
   */
  updateBatch(updates: GanttUpdateDto[]): Observable<any> {
    if (!updates || updates.length === 0) {
      return throwError(() => new Error('No hay cambios pendientes para sincronizar.'));
    }

    return this.http.patch(`${this.API_URL}/batch`, { updates }).pipe(
      tap(() => console.log('📦 Sincronización masiva completada')),
      catchError(this.handleError),
    );
  }

  /**
   * 🚪 Gestión de exclusión del Gantt
   */
  removeFromGantt(jobId: string): Observable<any> {
    return this.http
      .patch(`${this.API_URL}/remove-from-gantt/${jobId}`, {})
      .pipe(catchError(this.handleError));
  }

  /**
   * 🛡️ Manejador de errores para depuración técnica
   */
  private handleError(error: HttpErrorResponse) {
    let msg = 'Error en el servidor de Vox Strategos';

    // Captura específica del error de Enum de Postgres (suele venir como 400 Bad Request)
    if (error.status === 400) {
      msg =
        error.error?.message ||
        'Error de validación: Revisa que el Estado sea válido para la base de datos.';
    } else if (error.status === 404) {
      msg = 'No se encontró el recurso solicitado en el backend.';
    } else if (error.error?.message) {
      msg = error.error.message;
    }

    console.error(`[GanttService Error]: ${msg}`, error);
    return throwError(() => new Error(msg));
  }
}
