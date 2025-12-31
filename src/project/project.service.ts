import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateProjectDto, UpdateProjectDto } from 'dto/project.dto';
import { Project } from 'entities/project.entity';
import { IsNull, Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';

@Injectable()
export class ProjectsService {
	constructor(
		@InjectRepository(Project)
		private readonly projectRepository: Repository<Project>,
		@InjectRepository(User) private readonly userRepo: Repository<User>,
	) { }


	// EDIT the create method:
	async create(dto: CreateProjectDto, user?: any) {
		const exists = await this.projectRepository.findOne({
			where: { name: dto.name },
			withDeleted: true,
		});
		if (exists) {
			throw new BadRequestException('Project name already exists');
		}

		// Determine adminId based on user role
		let adminId: number | null = null;

		if (user) {
			if (user.role === UserRole.SUPERVISOR) {
				// For supervisor, set adminId to their user ID
				adminId = user.id;
			} else if (user.role === UserRole.ADMIN) {
				// For admin, keep adminId as null
				adminId = null;
			}
		}

		const project = this.projectRepository.create({
			...dto,
			adminId, // Set adminId based on role
		});

		return this.projectRepository.save(project);
	}

	async findAll(page = 1, limit = 10, user?: any) {
		let whereCondition: any = { deleted_at: null };
		const userData = await this.userRepo.findOne({where : {id : user?.id }})


		if (user.role === UserRole.SUPERVISOR) {
			whereCondition = {
				...whereCondition,
				id: userData?.project?.id
			};
		} else if (user.role === UserRole.ADMIN) {
			whereCondition = {
				...whereCondition,
			};
		}


		const [data, total] = await this.projectRepository.findAndCount({
			where: whereCondition,
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

async findAllForForm(page = 1, limit = 10, user?: any) {
		const userData = await this.userRepo.findOne({where : {id : user?.id }})




		const [data, total] = await this.projectRepository.findAndCount({

			skip: (page - 1) * limit,
			take: limit,
			order: { created_at: 'DESC' },
			withDeleted:false
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
			relations: ['users', "users.formSubmissions"],
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
