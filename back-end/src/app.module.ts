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
    // 1. Configuración global de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      // No hace falta envFilePath en Docker, Nest lee automáticamente las variables del sistema
    }),

    // 2. Conexión Asíncrona a la Base de Datos
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        // Si DB_HOST no existe (local), usa 'localhost'. En Docker usará 'db'
        host: config.get<string>('DB_HOST') || 'localhost',
        // Puerto interno de Postgres en Docker es 5432. Local usas 5435.
        port: config.get<number>('DB_PORT') || 5432,
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        
        autoLoadEntities: true, 
        
        // --- ADVERTENCIAS CRÍTICAS ---
        synchronize: true,   // Útil para crear tablas automáticamente al inicio
        dropSchema: false,   // 👈 CAMBIADO A FALSE: Evita que se borren tus datos al reiniciar
        // -----------------------------

        retryAttempts: 10,
        retryDelay: 3000,
        keepConnectionAlive: true,
        
        extra: {
          max: 10, 
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
        },

        logging: ['error', 'warn'],
      }),
    }),

    TypeOrmModule.forFeature([Project, Job, User, Pago]), 

    AuthModule,
    JobsModule,
    PmiModule,
    UserModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class AppModule {}