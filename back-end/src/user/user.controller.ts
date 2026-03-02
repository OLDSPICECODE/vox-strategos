import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Post,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto'; // Asegúrate de crear este DTO

@Controller('user') // La ruta será http://localhost:3000/user
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id') // Maneja el error 404 al coincidir con el frontend
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(id, updateUserDto);
  }
  // src/user/user.controller.ts
  @Post(':id/change-password')
  async changePassword(
    @Param('id') id: string,
    @Body() passwords: any, // Luego puedes crear un DTO para esto
  ) {
    return this.userService.updatePassword(id, passwords);
  }
}
