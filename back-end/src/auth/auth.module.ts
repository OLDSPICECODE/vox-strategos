import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

// Módulos relacionados
import { JobsModule } from '../jobs/jobs.module';

// Entidades de Sedapar CRM
import { User } from './entities/user.entity';
import { Project } from './entities/project.entity';
import { Job } from './entities/job.entity';
import { JobLog } from './entities/job-log.entity'; // 🚀 IMPORTACIÓN NECESARIA
import { Resource } from './entities/resource.entity';

@Module({
  imports: [
    // 🏛️ REGISTRO DE ENTIDADES
    // Añadimos JobLog para que el repositorio esté disponible en el AuthService
    TypeOrmModule.forFeature([
      User, 
      Project, 
      Job, 
      JobLog,
      Resource
    ]),
    
    // Importamos el módulo completo para activar las rutas de JobsController
    JobsModule, 
  ],
  providers: [AuthService], 
  controllers: [AuthController],
  exports: [AuthService], 
})
export class AuthModule {}