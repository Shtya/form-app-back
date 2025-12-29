import { Controller, Post, Get, Param, Body, Patch, Delete, ParseIntPipe, UseGuards, Query, Req } from '@nestjs/common';
import { ProjectsService } from './project.service';
import { CreateProjectDto, UpdateProjectDto } from 'dto/project.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { UserRole } from '../../entities/user.entity';
import { Roles } from '../auth/roles.decorator';

@Controller('projects')
export class ProjectsController {
	constructor(private readonly projectsService: ProjectsService) { }

	@Post()
	@UseGuards(AuthGuard)
	@Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
	create(@Body() dto: CreateProjectDto, @Req() req: any) {
		const user = req.user;
		return this.projectsService.create(dto, user);
	}

	@Get()

	findAll(
		@Query('page') page = '1',
		@Query('limit') limit = '10',
		@Req() req: any
	) {
		const user = req.user;
		return this.projectsService.findAll(+page, +limit, user);
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
