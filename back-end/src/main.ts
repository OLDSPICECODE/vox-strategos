import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // 1. Inicialización
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 2. Pipes Globales (Validación de DTOs)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /**
   * 3. Configuración de CORS Dinámico
   * Si en el .env existe CORS_ORIGIN lo usa, si no, permite todo ('*').
   * En producción (Docker/Nginx), '*' es lo más seguro para evitar el error de status 0.
   */
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

  /**
   * 4. Servidor de Archivos Estáticos
   * El path se construye dinámicamente según la carpeta donde se ejecute.
   */
  const pathDeSubidas = join(process.cwd(), 'uploads');
  
  app.useStaticAssets(pathDeSubidas, {
    prefix: '/uploads/',
    setHeaders: (res) => {
      res.set('Content-Disposition', 'attachment');
      res.set('Access-Control-Allow-Origin', '*');
    },
  });

  /**
   * 5. Arranque del Servidor
   * En Docker es VITAL escuchar en '0.0.0.0' para que el contenedor sea accesible.
   */
  const port = process.env.PORT || 3000;
  
  await app.listen(port, '0.0.0.0');

  console.log('---------------------------------------------------------');
  logger.log(`🚀 Servidor corriendo en el puerto: ${port}`);
  logger.log(`📂 Subidas configuradas en: ${pathDeSubidas}`);
  logger.log(`🌍 Entorno actual: ${process.env.NODE_ENV || 'development'}`);
  console.log('---------------------------------------------------------');
}

bootstrap();