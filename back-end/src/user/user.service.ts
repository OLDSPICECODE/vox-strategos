import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity'; // Verifica que la ruta sea correcta
import { UpdateUserDto } from './dto/update-user.dto';

import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 🚀 Retorna todos los usuarios de la base de datos
   * Usamos 'select' para traer solo lo necesario y proteger la privacidad
   */
  async findAll() {
    return await this.userRepository.find({
      select: {
        id: true,
        nombreCompleto: true, // O 'fullName' / 'firstName' según tu entidad
        email: true,
        // cargo: true, // Si tienes este campo en tu entidad User, actívalo
      },
      order: {
        nombreCompleto: 'ASC', // Los ordena alfabéticamente
      },
    });
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user)
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    // Buscamos el usuario y cargamos sus valores actuales
    const user = await this.userRepository.preload({
      id: id,
      ...updateUserDto,
    });

    if (!user)
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);

    try {
      return await this.userRepository.save(user);
    } catch (error) {
      // Manejo de errores de base de datos (ej: duplicados)
      throw error;
    }
  }

  async updatePassword(id: string, data: any) {
    const { currentPassword, newPassword } = data;

    // 1. Buscamos al usuario incluyendo el password (ya que suele estar con select: false)
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'password'],
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
