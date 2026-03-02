import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller() // Sin prefijo, responde a la raíz http://localhost:3000
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    // Llama al mensaje de bienvenida del AppService
    return this.appService.getHello();
  }
}