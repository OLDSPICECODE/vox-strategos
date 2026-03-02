// src/main.ts
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  /**
   * 1. Inicialización de la aplicación
   * Habilitamos NestExpressApplication para el manejo de archivos estáticos.
   */
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  /**
   * 2. Configuración de Pipes Globales (CRÍTICO para DTOs)
   * Esto permite que las validaciones de UpdateUserDto funcionen automáticamente.
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remueve propiedades que no estén en el DTO.
      forbidNonWhitelisted: true, // Lanza error si envían datos no permitidos.
      transform: true, // Transforma los tipos de los payloads a los definidos en el DTO.
    }),
  );

  /**
   * 3. Configuración de Prefijo Global (Opcional pero recomendado)
   * Si decides usar /api/user, descomenta la línea de abajo.
   */
  // app.setGlobalPrefix('api');

  /**
   * 4. Configuración de CORS
   * Permitimos la conexión desde tu frontend de Angular (localhost:4200).
   */
  app.enableCors({
    origin: 'http://localhost:4200',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

  /**
   * 5. Configuración de Servidor de Archivos Estáticos
   * Mapea la carpeta física 'uploads' a la ruta virtual '/uploads'.
   */
  const pathDeSubidas = join(process.cwd(), 'uploads');
  
  app.useStaticAssets(pathDeSubidas, {
    prefix: '/uploads/',
    setHeaders: (res) => {
      // Forzamos descarga para evitar conflictos con el router de Angular.
      res.set('Content-Disposition', 'attachment');
      res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
    },
  });

  /**
   * 6. Arranque del Servidor
   */
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log('---------------------------------------------------------');
  logger.log(`📂 Archivos estáticos servidos desde: ${pathDeSubidas}`);
  logger.log(`🚀 Vox Strategos Backend corriendo en: http://localhost:${port}`);
  console.log('---------------------------------------------------------');
}

bootstrap();