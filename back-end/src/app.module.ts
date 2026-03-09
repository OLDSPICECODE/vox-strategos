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
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env', 
    }),

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
        synchronize: true, // Mantener en true solo en desarrollo
        
        dropSchema: true, //(Esto borraba tu DB en cada reinicio)
        

        retryAttempts: 10,
        retryDelay: 3000,
        keepConnectionAlive: true,
        
        extra: {
          max: 10, // Pool de conexiones
          connectionTimeoutMillis: 2000,
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