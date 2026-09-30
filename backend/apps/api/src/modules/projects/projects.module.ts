import { Module } from '@nestjs/common';
import { ProjectsService } from './application/projects.service';
import { ProjectsController } from './presentation/projects.controller';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
