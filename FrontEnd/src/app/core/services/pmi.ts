import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, tap } from 'rxjs';
// 🚀 IMPORTANTE: Importamos el environment dinámico
import { environment } from '../../../environments/environment';

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

  // 🛰️ DINÁMICO: Cambia entre localhost (dev) y /api (prod) automáticamente
  private readonly API_URL = `${environment.apiUrl}/pmi`;

  // 🚀 SIGNALS DE ESTADO
  private _projects = signal<any[]>([]);
  public projects = this._projects.asReadonly();

  private _storage = signal<StorageStats>({
    used: 0,
    total: 200,
    unit: 'GB',
    filesByType: [],
  });
  public storage = this._storage.asReadonly();

  /**
   * 📂 CARGA DE ALMACENAMIENTO REAL
   */
  fetchStorageStats(projectId: string): Observable<StorageStats> {
    return this.http.get<StorageStats>(`${this.API_URL}/dashboard/${projectId}/storage`).pipe(
      tap((data) => this._storage.set(data)),
      catchError(this.handleError),
    );
  }

  /**
   * 🏗️ LISTADO DE PROYECTOS
   */
  fetchProjects(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/projects`).pipe(
      tap((data) => this._projects.set(data)),
      catchError(this.handleError),
    );
  }

  /**
   * 📜 BITÁCORA DE ACTIVIDAD
   */
  getRecentActivity(projectId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.API_URL}/activity/${projectId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * 📈 MÉTRICAS ESPECÍFICAS
   */
  getProjectMetrics(projectId: string): Observable<any> {
    return this.http
      .get<any>(`${this.API_URL}/dashboard/${projectId}/stats`)
      .pipe(catchError(this.handleError));
  }

  /**
   * 👥 ASIGNACIÓN DE PERSONAL
   */
  assignStaff(projectId: string, staffData: any, role: string): Observable<any> {
    const body = { staffData, role };
    return this.http
      .post(`${this.API_URL}/projects/${projectId}/staff`, body)
      .pipe(catchError(this.handleError));
  }

  /**
   * 📊 REPORTE PRESUPUESTARIO
   */
  getBudgetReport(): Observable<any> {
    return this.http.get(`${this.API_URL}/budget/report`).pipe(catchError(this.handleError));
  }

  /**
   * 🛡️ GESTOR DE ERRORES
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error en el sistema PMI de Sedapar.';
    if (error.status === 0) {
      errorMessage = 'Error de conexión: El servidor PMI no responde.';
    } else if (error.error instanceof ErrorEvent) {
      errorMessage = `Error de Red: ${error.error.message}`;
    } else {
      errorMessage = error.error?.message || `Código: ${error.status}, Mensaje: ${error.message}`;
    }
    console.error(`[PmiService Error]: ${errorMessage}`, error);
    return throwError(() => new Error(errorMessage));
  }
}
