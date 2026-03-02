import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JobsService } from './jobs.service';
import { JobDependenciesService } from './job_dependencies/job-dependencies.service'; // Ajusta la ruta
import { DependencyType } from '../auth/entities/job-dependency.entity';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly dependencyService: JobDependenciesService,
  ) {}

  /**
   * 🕸️ CREAR DEPENDENCIA ENTRE TAREAS
   * Conecta dos trabajos para el Diagrama de Gantt
   */
  @Post('dependencies')
  @HttpCode(HttpStatus.CREATED)
  async addDependency(
    @Body()
    body: {
      predecessorId: string;
      successorId: string;
      type: DependencyType;
      lag: number;
    },
  ) {
    return await this.dependencyService.createDependency(
      body.predecessorId,
      body.successorId,
      body.type,
      body.lag,
    );
  }

  /**
   * 📊 DATOS PARA DIAGRAMA DE GANTT
   * Retorna los trabajos y sus conexiones de un proyecto específico
   */
  @Get('project/:projectId/gantt')
  async getGanttData(@Param('projectId', ParseUUIDPipe) projectId: string) {
    // Obtenemos los trabajos y las dependencias en paralelo
    const [jobs, dependencies] = await Promise.all([
      this.jobsService.findByProject(projectId), // Asegúrate de tener este método en JobsService
      this.dependencyService.getDependenciesByProject(projectId),
    ]);

    return { jobs, dependencies };
  }

  /**
   * 🗑️ ELIMINAR DEPENDENCIA
   */
  @Delete('dependencies/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDependency(@Param('id') id: string) {
    // LLAMAMOS AL SERVICIO, NO AL REPO
    return await this.dependencyService.removeDependency(id);
  }
  /**
   * 📊 HISTORIAL GLOBAL (Nuevo para Dashboard PMI)
   * Trae los logs de todos los trabajos con sus relaciones.
   */
  @Get('all/logs')
  async getGlobalLogs() {
    return await this.jobsService.getGlobalLogs();
  }

  /**
   * 📜 HISTORIAL POR TAREA
   */
  @Get(':id/logs')
  async getLogs(@Param('id', ParseUUIDPipe) id: string) {
    return await this.jobsService.getJobLogs(id);
  }

  /**
   * 💾 REGISTRO MANUAL DE ACTIVIDAD
   */
  @Post(':id/logs')
  @HttpCode(HttpStatus.CREATED)
  async createLog(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() logData: any,
  ) {
    return await this.jobsService.saveJobLog(id, logData);
  }

  /**
   * 🚀 SUBIDA DE ARCHIVOS FÍSICOS
   */
  @Post(':id/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(
            null,
            `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`,
          );
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('usuario') usuario: string,
  ) {
    const relativePath = `uploads/${file.filename}`;
    return await this.jobsService.addAttachment(
      id,
      {
        nombre: file.originalname,
        url: relativePath,
        tipo: 'file',
        size: file.size, // 👈 Guardamos el tamaño real en bytes (Multer lo da por defecto)
      },
      usuario || 'Usuario Sedapar',
    );
  }

  /**
   * 🔗 VINCULACIÓN DE ENLACES EXTERNOS
   */
  @Post(':id/links')
  async addLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { nombre: string; url: string; usuario: string },
  ) {
    return await this.jobsService.addAttachment(
      id,
      { nombre: body.nombre, url: body.url, tipo: 'link' },
      body.usuario || 'Usuario Sedapar',
    );
  }

  // --- GESTIÓN DE TAREAS ---

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() taskData: any) {
    return await this.jobsService.create(taskData);
  }

  @Get('my-tasks/:userId')
  async getMyTasks(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.jobsService.findByUser(userId);
  }

  @Get('calendar/:userId')
  async getCalendar(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return await this.jobsService.findByDateRange(userId, start, end);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { estado: string; usuario: string; comentario?: string },
  ) {
    return await this.jobsService.updateStatus(
      id,
      body.estado,
      body.usuario,
      body.comentario,
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.jobsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateJobDto: any,
  ) {
    return await this.jobsService.update(id, updateJobDto);
  }
}
