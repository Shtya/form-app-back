import { Controller, Post, Get, Param, Body, Patch, Delete, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { ProjectsService } from './project.service';
import { CreateProjectDto, UpdateProjectDto } from 'dto/project.dto';
import { AuthGuard } from 'src/auth/auth.guard';

// @UseGuards(AuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Get()
  findAll(@Query('page') page = '1', @Query('limit') limit = '10') {
    return this.projectsService.findAll(+page, +limit);
  }

  @Get(':id/users')
  getUsersByProject(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.getUsersByProject(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.remove(id);
  }
}
