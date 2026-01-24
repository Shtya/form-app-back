import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; 
import { Project } from 'entities/project.entity';
import { ProjectsController } from './project.controller';
import { ProjectsService } from './project.service';
import { JwtService } from '@nestjs/jwt';
import { User } from 'entities/user.entity';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [TypeOrmModule.forFeature([Project , User]), HttpModule],
  controllers: [ProjectsController],
  providers: [ProjectsService , JwtService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
