import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { Project } from '../auth/entities/project.entity';
import { Pago } from '../auth/entities/movimientos.entity';

@Module({
  // 1. Registramos la entidad para que el Repositorio sea inyectable
  imports: [TypeOrmModule.forFeature([Project]), Pago],
  
  // 2. Declaramos el controlador para que Nest escuche las rutas (/projects)
  controllers: [ProjectController],
  
  // 3. Declaramos el servicio para que pueda usarse en el controlador
  providers: [ProjectService],
  
  // 4. Lo exportamos por si necesitas usar Proyectos en el módulo de Jobs
  exports: [ProjectService]
})
export class ProjectsModule {}