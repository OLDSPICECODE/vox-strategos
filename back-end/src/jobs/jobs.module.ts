import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobDependenciesService } from './job_dependencies/job-dependencies.service';

// Entidades
import { Job } from '../auth/entities/job.entity'; 
import { Project } from '../auth/entities/project.entity';
import { JobLog } from '../auth/entities/job-log.entity';
import { Milestone } from '../auth/entities/milestone.entity';
import { JobDependency } from '../auth/entities/job-dependency.entity'; // Nueva entidad
import { User } from '../auth/entities/user.entity';
import { Resource } from '../auth/entities/resource.entity';

// PMI (Si están en el mismo módulo, se mantienen aquí)
import { PmiController } from '../pmi/pmi.controller';
import { PmiService } from '../pmi/pmi.service';

@Module({
  imports: [
    /**
     * 🚀 REGISTRO DE ENTIDADES:
     * Incluimos 'JobDependency' para que el repositorio pueda ser inyectado 
     * en el JobDependenciesService.
     */
    TypeOrmModule.forFeature([
      Job, 
      Project, 
      JobLog, 
      Milestone, 
      JobDependency,
      User, 
      Resource
    ]),
  ],
  controllers: [
    // Endpoints de gestión de tareas y dependencias
    JobsController,
    PmiController
  ],
  providers: [
    // Lógica de negocio
    JobsService,
    JobDependenciesService,
    PmiService
  ],
  exports: [
    // Exportamos ambos para que otros módulos (como Proyectos) los usen
    JobsService,
    JobDependenciesService
  ],
})
export class JobsModule {}