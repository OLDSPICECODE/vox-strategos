import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { PmiService } from './pmi.service';
import { Project } from '../auth/entities/project.entity';

/**
 * 🏛️ Controlador de Infraestructura y Gestión (PMI)
 * Maneja la creación de proyectos, asignación de personal y reportes financieros.
 */
@Controller('pmi')
export class PmiController {
  constructor(private readonly pmiService: PmiService) {}

  // --- GESTIÓN DE PROYECTOS ---

  @Post('projects')
  @HttpCode(HttpStatus.CREATED)
  async createProject(@Body() projectData: Partial<Project>) {
    return await this.pmiService.createProject(projectData);
  }

  @Get('projects')
  async findAllProjects() {
    return await this.pmiService.findAllProjects();
  }

  @Get('projects/:id')
  async findProjectById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.pmiService.findProjectById(id);
  }

  @Patch('projects/:id')
  async updateProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: Partial<Project>,
  ) {
    return await this.pmiService.updateProject(id, updateData);
  }

  // --- GESTIÓN DE PERSONAL (PMI & WORKERS) ---

  @Post('projects/:id/assign-staff')
  async assignStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() staffData: { userIds: string[]; role: 'pmi' | 'worker' },
  ) {
    return await this.pmiService.assignStaffToProject(
      id,
      staffData.userIds,
      staffData.role,
    );
  }

  @Get('users/staff-stats')
  async getStaffPerformance() {
    // Este endpoint alimenta la "Pagina de personal" con el progreso de cada uno
    return await this.pmiService.getStaffStats();
  }

  // --- DASHBOARD & FINANZAS ---

  @Get('dashboard/stats')
  async getGlobalStats() {
    // Retorna el resumen de presupuestoTotal, presupuestoConsumido e hitos
    return await this.pmiService.getGlobalMetrics();
  }

  @Get('budgets/summary')
  async getBudgetSummary() {
    return await this.pmiService.getDetailedBudgetReport();
  }

  // ==========================================
  // 📌 GESTIÓN DE HITOS ESTRATÉGICOS (CRUD)
  // ==========================================

  @Post('projects/:projectId/milestones')
  async createMilestone(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body()
    milestoneData: {
      nombre: string;
      fecha: string;
      estado: string;
      descripcion?: string;
    },
  ) {
    // ➕ Crea un hito en la tabla Milestone vinculada al proyecto
    return await this.pmiService.createMilestone(projectId, milestoneData);
  }

  @Patch('projects/:projectId/milestones/:milestoneId')
  async updateMilestone(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() updateData: any,
  ) {
    // ✏️ Actualiza un hito existente
    return await this.pmiService.updateMilestone(
      projectId,
      milestoneId,
      updateData,
    );
  }

  @Delete('projects/:projectId/milestones/:milestoneId')
  async deleteMilestone(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
  ) {
    // 🗑️ Elimina el hito de la base de datos
    return await this.pmiService.deleteMilestone(projectId, milestoneId);
  }

  // ==========================================
  // --- DASHBOARD & MÉTRICAS DINÁMICAS ---
  // ==========================================

  @Get('storage')
  async getStorageUsage() {
    // Definimos el límite de 200 GB (en Gigabytes)
    const LIMIT_GB = 200;

    // El servicio calculará el peso real de la carpeta uploads
    const usedBytes = await this.pmiService.getUploadsFolderSize();

    // Conversión de Bytes a GB: Bytes / (1024^3)
    const usedGB = parseFloat((usedBytes / 1024 ** 3).toFixed(2));

    return {
      used: usedGB,
      total: LIMIT_GB,
      percent: parseFloat(((usedGB / LIMIT_GB) * 100).toFixed(2)),
      path: 'uploads/',
    };
  }

  @Get('dashboard/:projectId/stats')
  async getProjectStats(@Param('projectId', ParseUUIDPipe) projectId: string) {
    // Retorna tareas totales, hitos y presupuesto consumido de ese proyecto específico
    return await this.pmiService.getMetricsByProject(projectId);
  }

  @Get('dashboard/:projectId/storage')
  async getProjectStorage(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    // 1. Busca en la BD todos los archivos asociados a este proyecto (tabla JobAttachment)
    // 2. Suma el tamaño real de esos archivos en la carpeta uploads
    return await this.pmiService.calculateStorageByProject(projectId);
  }

  @Get('activity/:projectId')
  async getProjectActivity(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    // Retorna los logs de tareas vinculados a este proyecto
    return await this.pmiService.getRecentActivity(projectId);
  }
}
