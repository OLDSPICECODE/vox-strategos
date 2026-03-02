import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PmiController } from './pmi.controller';
import { PmiService } from './pmi.service';

// Importamos las entidades necesarias
import { Project } from '../auth/entities/project.entity';
import { User } from '../auth/entities/user.entity';
import { Resource } from '../auth/entities/resource.entity'; // 🚀 IMPORTANTE: Añade esta línea

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, User, Resource]), // 👈 Sincronizado
  ],
  controllers: [PmiController],
  providers: [PmiService],
  exports: [PmiService],
})
export class PmiModule {}