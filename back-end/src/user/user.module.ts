import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [
    // Registra la entidad para que el repositorio pueda inyectarse
    TypeOrmModule.forFeature([User])
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // Exportamos para que otros módulos (Auth) puedan usarlo
})
export class UserModule {}