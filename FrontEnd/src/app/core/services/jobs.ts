import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, tap, firstValueFrom } from 'rxjs';
import { Job, JobAttachment } from '../../shared/models/job';

/**
 * Interfaz para el historial de actividad técnica (Logs).
 */
export interface JobActivity {
  id?: number;
  usuario: string;
  accion: string;
  descripcion: string;
  comentario?: string;
  fecha: Date;
  job?: { id: string; nombre: string };
}

@Injectable({
  providedIn: 'root',
})
export class JobsService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/jobs';

  // 🚀 SIGNAL: Estado reactivo de las tareas en la UI
  private _tasks = signal<Job[]>([]);
  public tasks = this._tasks.asReadonly();

  // ==========================================
  // 📊 GANTT & OPERACIONES MASIVAS
  // ==========================================

  /**
   * 📦 ACTUALIZACIÓN MASIVA (Crucial para el Gantt)
   */
  updateBatch(updates: any[]): Observable<any> {
    return this.http.patch(`${this.API_URL}/batch`, { updates }).pipe(
      tap(() => console.log('Sincronización masiva completada.')),
      catchError(this.handleError),
    );
  }

  /**
   * 🕸️ OBTENER DATOS DEL PROYECTO PARA GANTT
   */
  getGanttData(projectId: string): Observable<{ jobs: Job[]; dependencies: any[] }> {
    return this.http
      .get<{ jobs: Job[]; dependencies: any[] }>(`${this.API_URL}/project/${projectId}/gantt`)
      .pipe(catchError(this.handleError));
  }

  // ==========================================
  // 🚀 CRUD & PERSISTENCIA INDIVIDUAL
  // ==========================================

  loadTasks(userId: string): void {
    this.http
      .get<Job[]>(`${this.API_URL}/my-tasks/${userId}`)
      .pipe(catchError(this.handleError))
      .subscribe((data: Job[]) => this._tasks.set(data));
  }

  findAll(): Observable<Job[]> {
    return this.http.get<Job[]>(this.API_URL).pipe(catchError(this.handleError));
  }

  findOne(id: string): Observable<Job> {
    return this.http.get<Job>(`${this.API_URL}/${id}`).pipe(catchError(this.handleError));
  }

  createJob(taskData: Partial<Job>): Observable<Job> {
    return this.http.post<Job>(this.API_URL, taskData).pipe(
      tap((newTask: Job) => this._tasks.update((current) => [newTask, ...current])),
      catchError(this.handleError),
    );
  }

  updateJob(jobId: string, taskData: Partial<Job>): Observable<Job> {
    return this.http.patch<Job>(`${this.API_URL}/${jobId}`, taskData).pipe(
      tap((updatedJob: Job) => {
        this.updateTaskInSignal(jobId, () => updatedJob);
      }),
      catchError(this.handleError),
    );
  }

  // ==========================================
  // 📅 CALENDARIO & ESTADOS RÁPIDOS
  // ==========================================

  getCalendarTasks(userId: string, start: string, end: string): Observable<Job[]> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http
      .get<Job[]>(`${this.API_URL}/calendar/${userId}`, { params })
      .pipe(catchError(this.handleError));
  }

  updateJobStatus(
    jobId: string,
    estado: string,
    usuario: string,
    comentario: string = '',
  ): Observable<Job> {
    const body = { estado, usuario, comentario };
    return this.http.patch<Job>(`${this.API_URL}/${jobId}/status`, body).pipe(
      tap((updatedJob: Job) => this.updateTaskInSignal(jobId, () => updatedJob)),
      catchError(this.handleError),
    );
  }

  // ==========================================
  // 📂 GESTIÓN DE ARCHIVOS Y RECURSOS
  // ==========================================

  /**
   * 📥 DESCARGA DE ARCHIVOS (Resuelve el error TS2339)
   */
  downloadFile(url: string): Observable<Blob> {
    // Es importante usar responseType: 'blob' para que Angular no intente parsear el archivo como JSON
    return this.http.get(url, { responseType: 'blob' }).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('El archivo no está disponible en el servidor.'));
      }),
    );
  }

  uploadAttachment(jobId: string, formData: FormData): Observable<JobAttachment> {
    return this.http.post<JobAttachment>(`${this.API_URL}/${jobId}/upload`, formData).pipe(
      tap((newAt: JobAttachment) => {
        this.updateTaskInSignal(jobId, (task) => ({
          ...task,
          adjuntos: [...(task.adjuntos || []), newAt],
        }));
      }),
      catchError(this.handleError),
    );
  }

  addLinkToJob(
    jobId: string,
    linkData: { nombre: string; url: string; usuario: string },
  ): Observable<Job> {
    return this.http.post<Job>(`${this.API_URL}/${jobId}/links`, linkData).pipe(
      tap((updatedJob: Job) => this.updateTaskInSignal(jobId, () => updatedJob)),
      catchError(this.handleError),
    );
  }

  // ==========================================
  // 📊 DASHBOARD & AUDITORÍA (LOGS)
  // ==========================================

  getGlobalLogs(): Promise<JobActivity[]> {
    return firstValueFrom(
      this.http.get<JobActivity[]>(`${this.API_URL}/all/logs`).pipe(catchError(this.handleError)),
    );
  }

  getJobLogs(jobId: string | number): Observable<JobActivity[]> {
    return this.http
      .get<JobActivity[]>(`${this.API_URL}/${jobId}/logs`)
      .pipe(catchError(this.handleError));
  }

  saveJobLog(jobId: string | number, logData: Partial<JobActivity>): Observable<JobActivity> {
    return this.http
      .post<JobActivity>(`${this.API_URL}/${jobId}/logs`, logData)
      .pipe(catchError(this.handleError));
  }

  // ==========================================
  // 🛠️ HELPERS PRIVADOS
  // ==========================================

  private updateTaskInSignal(jobId: string, updateFn: (task: Job) => Job): void {
    this._tasks.update((tasks: Job[]) => tasks.map((t: Job) => (t.id === jobId ? updateFn(t) : t)));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error en el sistema Vox Strategos.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error de Red: ${error.error.message}`;
    } else {
      errorMessage = error.error?.message || `Código: ${error.status}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}
