// back-end/src/project/project.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { ProjectService } from './project.service';

@Controller('project') // 👈 DEBE SER SINGULAR
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get('worker/:userId') // 👈 DEBE COINCIDIR CON LA URL DEL ERROR
  async findByWorker(@Param('userId') userId: string) {
    return await this.projectService.findByWorker(userId);
  }
}