import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { AuthService } from './auth'; // Asegúrate de que esta ruta sea correcta
import { Project } from '../../shared/models/project'; 
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  
  // URL base apuntando al controlador de proyectos en tu NestJS
  private readonly API_URL = `${environment.apiUrl}/project`; 

  // --- SIGNALS DE ESTADO ---
  // Almacena la lista de proyectos recuperados
  private _projects = signal<Project[]>([]);
  public userProjects = this._projects.asReadonly();
  
  // Rastra el ID del proyecto seleccionado actualmente
  public selectedProjectId = signal<string | null>(null);

  /**
   * 📈 COMPUTED SIGNAL: activeProject
   * Se recalcula automáticamente cuando cambia la lista de proyectos o el ID seleccionado.
   * Devuelve el objeto completo del proyecto activo.
   */
  public activeProject = computed(() => {
    const projects = this._projects();
    const selectedId = this.selectedProjectId();
    
    if (selectedId) {
      return projects.find(p => p.id === selectedId) || null;
    }
    return projects.length > 0 ? projects[0] : null;
  });

  /**
   * 🚀 OBTENER TODOS LOS PROYECTOS
   * Recupera los proyectos vinculados al usuario (vía su ID de trabajador).
   */
  getAll(): Observable<Project[]> {
    const user = this.authService.currentUser();
    
    // Blindaje: Si no hay usuario en sesión, no intentamos la petición
    if (!user) {
      return throwError(() => new Error('No se detectó una sesión activa en Vox Strategos.'));
    }

    return this.http.get<Project[]>(`${this.API_URL}/worker/${user.id}`)
      .pipe(
        tap(data => {
          this._projects.set(data);
          // Inicialización automática: si hay proyectos y ninguno seleccionado, marcamos el primero
          if (data.length > 0 && !this.selectedProjectId()) {
            this.selectedProjectId.set(data[0].id);
          }
        }),
        catchError(error => {
          console.error('❌ Error de conexión con el servidor:', error);
          return throwError(() => new Error('Error al recuperar los proyectos desde la base de datos.'));
        })
      );
  }

  /**
   * Helper para cargar los proyectos sin necesidad de manejar la suscripción en el componente
   */
  loadProjects(): void {
    this.getAll().subscribe();
  }

  /**
   * 🎯 CAMBIAR PROYECTO SELECCIONADO
   * Al actualizar el Signal selectedProjectId, todos los "computed" y "effects"
   * que dependan de él se dispararán automáticamente (como el Gantt).
   */
  setSelectedProject(id: string): void {
    if (this.selectedProjectId() !== id) {
      this.selectedProjectId.set(id);
    }
  }

  /**
   * 🧹 LIMPIEZA
   * Útil para cuando el usuario cierra sesión.
   */
  clearProjects(): void {
    this._projects.set([]);
    this.selectedProjectId.set(null);
  }
}