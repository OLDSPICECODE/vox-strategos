import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller() 
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    // Esto te servirá para entrar a la URL de ngrok/api y ver si el back responde
    return '🚀 Vox Strategos API is Online';
  }

  // Opcional: Un endpoint de salud para Docker
  @Get('health')
  checkHealth() {
    return { status: 'ok', uptime: process.uptime() };
  }
}