import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PmiController } from './pmi.controller';
import { PmiService } from './pmi.service';

// Importamos las entidades necesarias
import { Project } from '../auth/entities/project.entity';
import { User } from '../auth/entities/user.entity';
import { Resource } from '../auth/entities/resource.entity'; 
import { Milestone } from '../auth/entities/milestone.entity';

@Module({
  imports: [
    // 👈 AÑADIMOS MILESTONE AL ARREGLO
    TypeOrmModule.forFeature([Project, User, Resource, Milestone]), 
  ],
  controllers: [PmiController],
  providers: [PmiService],
  exports: [PmiService],
})
export class PmiModule {}