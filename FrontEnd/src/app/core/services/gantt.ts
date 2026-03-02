import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment'; // Ajusta la ruta a tu carpeta environments
import { Observable, throwError } from 'rxjs';
import { catchError, retry, tap } from 'rxjs/operators';
import { Job } from '../../shared/models/job';

// Interfaces para el tipado estricto de las peticiones
export interface GanttUpdateDto {
  id: string;
  fechaInicio?: Date | string | null;
  fechaFin?: Date | string | null;
  inGantt?: boolean;
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
  
  // Construcción de la URL usando el environment
  private readonly API_URL = `${environment.apiUrl}/jobs`;

  /**
   * 📊 Obtiene toda la data para el Gantt de un proyecto específico.
   * El backend debe responder con { jobs: [], dependencies: [] }
   */
  getGanttData(projectId: string): Observable<GanttDataResponse> {
    return this.http.get<GanttDataResponse>(`${this.API_URL}/project/${projectId}/gantt`).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * 🚜 Actualización Masiva (Batch Update)
   * Se dispara al mover barras en el diagrama o al redimensionarlas.
   */
  updateBatch(updates: GanttUpdateDto[]): Observable<any> {
    if (!updates || updates.length === 0) {
      return throwError(() => new Error('No se enviaron actualizaciones.'));
    }

    return this.http.patch(`${this.API_URL}/batch`, { updates }).pipe(
      tap(() => console.log('✅ Sincronización de red exitosa')),
      catchError(this.handleError)
    );
  }

  /**
   * ➕ Activar Tarea (La Nuez)
   * Pasa una tarea del Backlog al flujo del Gantt asignándole fechas.
   */
  includeInGantt(jobId: string, start: Date, end: Date): Observable<any> {
    const update: GanttUpdateDto = {
      id: jobId,
      fechaInicio: start.toISOString(),
      fechaFin: end.toISOString(),
      inGantt: true
    };
    return this.updateBatch([update]);
  }

  /**
   * 🚪 Quitar del Gantt
   * Vuelve una tarea al estado "suelto" (Backlog) y limpia sus conexiones.
   */
  removeFromGantt(jobId: string): Observable<any> {
    // Usamos el endpoint específico que creamos en NestJS para limpiar flechas
    return this.http.patch(`${this.API_URL}/remove-from-gantt/${jobId}`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 🛡️ Manejo de errores centralizado
   */
  private handleError(error: HttpErrorResponse) {
    let msg = 'Ocurrió un error en la red de Vox Strategos';
    if (error.status === 404) {
      msg = 'No se encontró el endpoint. Verifica la ruta en el Backend.';
    } else if (error.error?.message) {
      msg = error.error.message;
    }
    console.error(`[GanttService Error]: ${msg}`, error);
    return throwError(() => new Error(msg));
  }
}