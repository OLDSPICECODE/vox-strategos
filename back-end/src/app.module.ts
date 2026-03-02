import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Módulos de la Aplicación
import { AuthModule } from './auth/auth.module';
import { JobsModule } from './jobs/jobs.module';
import { PmiModule } from './pmi/pmi.module';
import { UserModule } from './user/user.module';

// Entidades para el registro global
import { Project } from './auth/entities/project.entity';
import { Job } from './auth/entities/job.entity'; 
import { User } from './auth/entities/user.entity';
import { Pago } from './auth/entities/movimientos.entity';

// Servicios y Controladores de Proyectos
import { ProjectController } from './project/project.controller';
import { ProjectService } from './project/project.service';

@Module({
  imports: [
    // 1. Configuración Global de Variables de Entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env', 
    }),

    // 2. Conexión Asíncrona a PostgreSQL con TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST') || 'localhost',
        port: config.get<number>('DB_PORT') || 5435,
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        
        autoLoadEntities: true, 
        synchronize: true, 
        dropSchema: true, 
        logging: ['error', 'warn'],
      }),
    }),

    // 3. Registro de Entidades para Inyección
    // 🚀 AÑADIMOS 'User' AQUÍ PARA QUE PmiService PUEDA RESOLVER EL UserRepository
    TypeOrmModule.forFeature([Project, Job, User, Pago]), 

    // 4. Integración de Módulos Funcionales
    AuthModule,
    JobsModule,
    PmiModule,
    UserModule,
  ],
  controllers: [
    ProjectController,
    // Nota: PmiController ya debería estar en PmiModule, 
    // pero lo mantenemos aquí si prefieres manejo centralizado.
  ],
  providers: [
    ProjectService,
    // Nota: PmiService ya debería estar en PmiModule.
  ],
})
export class AppModule {}