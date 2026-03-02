import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findOne(id: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // Buscamos el usuario y cargamos sus valores actuales
    const user = await this.userRepository.preload({
      id: id,
      ...updateUserDto,
    });

    if (!user) throw new NotFoundException(`Usuario con ID ${id} no encontrado`);

    try {
      return await this.userRepository.save(user);
    } catch (error) {
      // Aquí podrías manejar errores de duplicidad de correo, etc.
      throw error;
    }
  }

async updatePassword(id: string, data: any) {
  const { currentPassword, newPassword } = data;

  // 1. Buscamos al usuario incluyendo el password (select: false)
  const user = await this.userRepository.findOne({
    where: { id },
    select: ['id', 'password']
  });

  if (!user) throw new NotFoundException('Usuario no encontrado');

  // 2. Verificamos la contraseña actual
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new UnauthorizedException('La contraseña actual es incorrecta');
  }

  // 3. Encriptamos la nueva contraseña y guardamos
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  
  await this.userRepository.save(user);
  return { message: 'Contraseña actualizada con éxito' };
}
}