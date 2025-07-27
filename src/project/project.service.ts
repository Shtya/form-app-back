import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateProjectDto, UpdateProjectDto } from 'dto/project.dto';
import { Project } from 'entities/project.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async create(dto: CreateProjectDto) {
    const exists = await this.projectRepository.findOne({
      where: { name: dto.name },
      withDeleted: true, // ✅ حتى لا يتكرر الاسم حتى لو محذوف
    });
    if (exists) {
      throw new BadRequestException('Project name already exists');
    }

    const project = this.projectRepository.create(dto);
    return this.projectRepository.save(project);
  }

  async findAll(page = 1, limit = 10) {
    const [data, total] = await this.projectRepository.findAndCount({
      where: { deleted_at: null },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return {
      total,
      page,
      lastPage: Math.ceil(total / limit),
      data,
    };
  }
  

  async getUsersByProject(projectId: number) {
  const project = await this.projectRepository.findOne({
    where: { id: projectId, deleted_at: null },
    relations: ['users' , "users.formSubmissions" ],
  });

  if (!project) {
    throw new NotFoundException('Project not found');
  }

  return project.users;
}


  async findOne(id: number) {
    const project = await this.projectRepository.findOne({
      where: { id, deleted_at: null },
      relations: ['users'],
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(id: number, dto: UpdateProjectDto) {
    const project = await this.projectRepository.findOne({ where: { id, deleted_at: null } });
    if (!project) throw new NotFoundException('Project not found');

    if (dto.name && dto.name !== project.name) {
      const exists = await this.projectRepository.findOne({
        where: { name: dto.name },
        withDeleted: true,
      });
      if (exists) {
        throw new BadRequestException('Project name already exists');
      }
    }

    Object.assign(project, dto);
    return this.projectRepository.save(project);
  }

  async remove(id: number) {
    const project = await this.projectRepository.findOne({ where: { id, deleted_at: null } });
    if (!project) throw new NotFoundException('Project not found');
    await this.projectRepository.softDelete(id); // ✅ حذف ناعم
    return { message: 'Project soft deleted' };
  }
}
