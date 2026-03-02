import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, tap } from 'rxjs';

/**
 * 📝 INTERFAZ DE ALMACENAMIENTO
 * Define la estructura exacta que envía el backend de NestJS.
 */
export interface StorageStats {
  used: number;
  total: number;
  unit: string;
  filesByType: Array<{
    extension: string;
    cantidad: number;
    label: string;
    icon: string;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class PmiService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/pmi';

  // 🚀 SIGNALS DE ESTADO
  // Se inicializan con valores por defecto para evitar errores de plantilla.
  private _projects = signal<any[]>([]);
  public projects = this._projects.asReadonly();

  private _storage = signal<StorageStats>({ 
    used: 0, 
    total: 200, 
    unit: 'GB',
    filesByType: [] 
  });
  public storage = this._storage.asReadonly();

  /**
   * 📂 CARGA DE ALMACENAMIENTO REAL
   * Llama al endpoint que consulta la tabla 'resources' y escanea la carpeta 'uploads'.
   */
  fetchStorageStats(projectId: string): Observable<StorageStats> {
    return this.http.get<StorageStats>(`${this.API_URL}/dashboard/${projectId}/storage`).pipe(
      tap((data) => this._storage.set(data)),
      catchError(this.handleError)
    );
  }

  /**
   * 🏗️ LISTADO DE PROYECTOS
   * Obtiene todos los proyectos de infraestructura registrados.
   */
  fetchProjects(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/projects`).pipe(
      tap((data) => this._projects.set(data)),
      catchError(this.handleError)
    );
  }

  /**
   * 📜 BITÁCORA DE ACTIVIDAD
   * Obtiene los logs de tareas filtrados por el proyecto seleccionado.
   */
  getRecentActivity(projectId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/activity/${projectId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 📈 MÉTRICAS ESPECÍFICAS
   * Obtiene progreso, hitos y presupuesto del proyecto actual.
   */
  getProjectMetrics(projectId: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/dashboard/${projectId}/stats`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 👥 ASIGNACIÓN DE PERSONAL
   * Envía los datos para vincular personal al equipo del proyecto.
   */
  assignStaff(projectId: string, staffData: any, role: string): Observable<any> {
    const body = { staffData, role };
    return this.http.post(`${this.API_URL}/projects/${projectId}/staff`, body).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 📊 REPORTE PRESUPUESTARIO
   * Obtiene la URL del reporte detallado generado en el backend.
   */
  getBudgetReport(): Observable<any> {
    return this.http.get(`${this.API_URL}/budget/report`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * 🛡️ GESTOR DE ERRORES
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error en el sistema PMI de Sedapar.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error de Red: ${error.error.message}`;
    } else {
      // Intentamos capturar el mensaje específico del backend (NestJS)
      errorMessage = error.error?.message || `Código: ${error.status}, Mensaje: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}