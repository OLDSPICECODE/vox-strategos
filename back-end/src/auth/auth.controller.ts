import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth') // Define la ruta base: localhost:3000/auth
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('login')
  async login(@Body() loginDto: any) {
    // 🔍 Agregamos un log aquí para ver qué llega desde Angular
    console.log('📦 Body recibido en el backend:', loginDto);

    // OJO: Asegúrate de pasar 'loginDto.password' y no solo 'loginDto.pass'
    return this.authService.validateUser(loginDto.email, loginDto.password);
  }
}
