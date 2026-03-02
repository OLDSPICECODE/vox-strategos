import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { UserRole } from './shared/models/user-role.enum';

// Importaciones de los componentes
import { LoginComponent } from './features/auth/login/login';
import { JefeComponent } from './features/jefe/jefe';
import { PmiDashboardComponent } from './features/pmi/dashboard/dashboard';
import { TrabajadorComponent } from './features/trabajador/dashboard/trabajador';

// Nuevas vistas para el portal de Sedapar
import { ProjectsComponent } from './features/trabajador/projects/projects';
import { CalendarComponent } from './features/trabajador/calendar/calendar';
import { PmiLayoutComponent } from './features/pmi/pmi-layout/pmi-layout';
import { PmiGanttComponent } from './features/pmi/pmi-gantt/pmi-gantt';
import { PmiTeamsComponent } from './features/pmi/pmi-teams/pmi-teams';
import { ProjectBuilderComponent } from './features/pmi/project-builder/project-builder';
import { BudgetManagerComponent } from './features/pmi/budget-manager/budget-manager';
import { PmiStaffComponent } from './features/pmi/pmi-staff/pmi-staff';
import { UsersAdminComponent } from './features/pmi/users-admin/users-admin';
import { UserProfileComponent } from './shared/components/user-profile/user-profile';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },

  {
    path: 'dashboard/jefe',
    component: JefeComponent,
    canActivate: [authGuard([UserRole.JEFE])],
  },

  {
    path: 'dashboard/pmi',
    component: PmiLayoutComponent, // Este componente tendrá el Sidebar
    canActivate: [authGuard([UserRole.PMI])],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: PmiDashboardComponent },
      { path: 'gantt', component: PmiGanttComponent },
      { path: 'projects', component: ProjectBuilderComponent },
      { path: 'budgets', component: BudgetManagerComponent },
      { path: 'staff', component: PmiStaffComponent },
      { path: 'teams', component: PmiTeamsComponent },
      { path: 'users', component: UsersAdminComponent },
      { path: 'profile', component: UserProfileComponent },
    ],
  },

  {
    path: 'dashboard/trabajador',
    component: TrabajadorComponent,
    canActivate: [authGuard([UserRole.TRABAJADOR])],
    children: [
      {
        path: 'projects',
        component: ProjectsComponent,
      },
      {
        path: 'calendar',
        component: CalendarComponent,
      },
      {
        path: 'tasks/:id',
        component: ProjectsComponent, // O el componente que uses para el tablero de tareas
      },
      {
        path: 'profile',
        component:UserProfileComponent
      },
    ],
  },

  // Redirecciones globales para garantizar la entrada al portal de Sedapar
  {
    path: '',
    redirectTo: 'login', // Es mejor redireccionar al login por defecto si no hay sesión
    pathMatch: 'full',
  },

  {
    path: '**',
    redirectTo: 'login',
  },
];
