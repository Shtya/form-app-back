import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; 
import { Project } from 'entities/project.entity';
import { ProjectsController } from './project.controller';
import { ProjectsService } from './project.service';
import { JwtService } from '@nestjs/jwt';
import { User } from 'entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project , User])],
  controllers: [ProjectsController],
  providers: [ProjectsService , JwtService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
