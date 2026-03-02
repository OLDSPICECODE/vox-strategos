import { Injectable, inject, signal } from '@angular/core'; // 👈 IMPORTANTE: Desde @angular/core
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, tap, firstValueFrom } from 'rxjs';
import { Job, JobAttachment } from '../../shared/models/job';

/**
 * Interfaz para el historial de actividad técnica.
 * Incluye la relación opcional con 'job' para el Dashboard del PMI.
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

  // 🚀 Signal centralizado para el estado de las tareas
  private _tasks = signal<Job[]>([]);
  public tasks = this._tasks.asReadonly();

  /**
   * 📊 DASHBOARD PMI: Obtiene logs globales de todos los trabajos.
   * Devuelve una Promesa para usar con async/await en el ngOnInit.
   */
  getGlobalLogs(): Promise<JobActivity[]> {
    return firstValueFrom(
      this.http.get<JobActivity[]>(`${this.API_URL}/all/logs`)
        .pipe(catchError(this.handleError))
    );
  }

  /**
   * 📜 HISTORIAL: Obtiene el historial de una tarea específica.
   */
  getJobLogs(jobId: string | number): Observable<JobActivity[]> {
    return this.http.get<JobActivity[]>(`${this.API_URL}/${jobId}/logs`)
      .pipe(catchError(this.handleError));
  }

  /**
   * 💾 AUDITORÍA: Guarda un nuevo registro de actividad (Log).
   */
  saveJobLog(jobId: string | number, logData: Partial<JobActivity>): Observable<JobActivity> {
    return this.http.post<JobActivity>(`${this.API_URL}/${jobId}/logs`, logData)
      .pipe(catchError(this.handleError));
  }

  /**
   * 🚀 OPERACIONES CRUD: Carga inicial de tareas del trabajador.
   */
  loadTasks(userId: string): void {
    this.http.get<Job[]>(`${this.API_URL}/my-tasks/${userId}`)
      .pipe(catchError(this.handleError))
      .subscribe((data: Job[]) => this._tasks.set(data));
  }

  /**
   * Crea una nueva tarea técnica en Sedapar.
   */
  createJob(taskData: Partial<Job>): Observable<Job> {
    return this.http.post<Job>(this.API_URL, taskData).pipe(
      tap((newTask: Job) => this._tasks.update(current => [newTask, ...current])),
      catchError(this.handleError)
    );
  }

  /**
   * Actualización general de la tarea (Modal Editar).
   */
  updateJob(jobId: string, taskData: Partial<Job>): Observable<Job> {
    return this.http.patch<Job>(`${this.API_URL}/${jobId}`, taskData).pipe(
      tap((updatedJob: Job) => this.updateTaskInSignal(jobId, () => updatedJob)),
      catchError(this.handleError)
    );
  }

  /**
   * 📅 CALENDARIO: Obtiene tareas en un rango de fechas.
   */
  getCalendarTasks(userId: string, start: string, end: string): Observable<Job[]> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http.get<Job[]>(`${this.API_URL}/calendar/${userId}`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * 🚀 ESTADOS: Cambio de estado con registro de auditoría.
   */
  updateJobStatus(jobId: string, estado: string, usuario: string, comentario: string = ''): Observable<Job> {
    const body = { estado, usuario, comentario };
    return this.http.patch<Job>(`${this.API_URL}/${jobId}/status`, body).pipe(
      tap((updatedJob: Job) => this.updateTaskInSignal(jobId, () => updatedJob)),
      catchError(this.handleError)
    );
  }

  /**
   * 📂 GESTIÓN DE ARCHIVOS: Subida de evidencias de campo.
   */
  uploadAttachment(jobId: string, formData: FormData): Observable<JobAttachment> {
    return this.http.post<JobAttachment>(`${this.API_URL}/${jobId}/upload`, formData).pipe(
      tap((newAt: JobAttachment) => {
        this.updateTaskInSignal(jobId, (task) => ({
          ...task,
          adjuntos: [...(task.adjuntos || []), newAt]
        }));
      }),
      catchError(this.handleError)
    );
  }

  /**
   * 🔗 VINCULACIÓN: Agrega un link externo a la tarea.
   */
  addLinkToJob(jobId: string, linkData: { nombre: string; url: string; usuario: string }): Observable<Job> {
    return this.http.post<Job>(`${this.API_URL}/${jobId}/links`, linkData).pipe(
      tap((updatedJob: Job) => this.updateTaskInSignal(jobId, () => updatedJob)),
      catchError(this.handleError)
    );
  }

  /**
   * 📥 DESCARGAS: Descarga de archivos binarios (Blob).
   */
  downloadFile(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' }).pipe(
      catchError((error: HttpErrorResponse) => {
        return throwError(() => new Error('El archivo no está disponible en el servidor.'));
      }),
    );
  }

  /**
   * 🛠️ HELPERS: Actualización reactiva de señales con tipado estricto.
   */
  private updateTaskInSignal(jobId: string, updateFn: (task: Job) => Job): void {
    this._tasks.update((tasks: Job[]) => 
      tasks.map((t: Job) => (t.id === jobId ? updateFn(t) : t))
    );
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

  findOne(id: string): Observable<Job> {
  return this.http.get<Job>(`${this.API_URL}/${id}`).pipe(
    catchError(this.handleError)
  );
}
}