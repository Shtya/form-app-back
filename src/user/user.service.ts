import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { User } from 'entities/user.entity';
import { UpdateUserDto } from 'dto/user.dto';
import { UserRole } from 'entities/user.entity';
import * as argon from 'argon2';
import { ListUsersDto } from './user.dto';

import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User)
		private readonly userRepo: Repository<User>,
        private readonly httpService: HttpService,
	) { }

    async checkEmployeeStatus(email: string): Promise<any> {
        try {
            console.log(`Checking employee status for: ${email}`);
            const response = await firstValueFrom(
                this.httpService.get(
                    `${process.env.NEST_PUBLIC_BASE_URL_2}/employees/by-email/${email}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${process.env.TOKENJWT_SECRET}`,
                        },
                    },
                ),
            );
            return response.data;
        } catch (error) {
            console.error('Failed to check employee status:', error.response?.data || error.message);
            // If 404, usually means not found or not active? 
            // Return null or throw depending on requirement. 
            // Based on user request, we want to know if active. 
            // If request fails, we can assume inactive or return error info.
            return { isActive: false, error: error.message }; 
        }
    }

	// EDIT the buildUsersQB method in user.service.ts:
	private buildUsersQB(dto: ListUsersDto, currentUser?: User): SelectQueryBuilder<User> {
		const qb = this.userRepo
			.createQueryBuilder('u')
			.leftJoinAndSelect('u.formSubmissions', 'fs')
			.leftJoinAndSelect('u.project', 'p')
			.orderBy('u.id', 'DESC');

		// SEARCH filter
		if (dto.search) {
			qb.andWhere(`(u.email ILIKE :q OR p.name ILIKE :q)`, { q: `%${dto.search}%` });
		}

		// ROLE filter
		if (dto.role) {
			qb.andWhere('u.role = :role', { role: dto.role });
		}

		// DATE RANGE filter
		if (dto.from) {
			qb.andWhere('u.created_at >= :from', { from: dto.from });
		}
		if (dto.to) {
			qb.andWhere('u.created_at <= :to', { to: dto.to });
		}

		if (currentUser.role === UserRole.SUPERVISOR) {
			qb.andWhere('(u.created_by = :createdBy)', {
				createdBy: currentUser.id
			});
		} else if (currentUser.role === UserRole.ADMIN) {
			qb.andWhere('u.created_by IS NULL');
		} else {
			// Regular user (if they can access) - show only admin-created users
			qb.andWhere('u.created_by IS NULL');
		}


		return qb;
	}

	// EDIT the findAll method signature:
	async findAll(dto: ListUsersDto, currentUser?: User): Promise<{ data: User[]; total: number; page: number; limit: number }> {
		const page = dto.page ?? 1;
		const limit = dto.limit ?? 10;

		const qb = this.buildUsersQB(dto, currentUser) // Pass currentUser
			.skip((page - 1) * limit)
			.take(limit);

		const [data, total] = await qb.getManyAndCount();

		return { data, total, page, limit };
	}

	async findOne(id: number): Promise<User> {
		const user = await this.userRepo.findOne({ where: { id } });
		if (!user) {
			throw new NotFoundException('User not found');
		}
		return user;
	}

	async updateUser(userId: number, dto: UpdateUserDto, currentUser: User): Promise<User> {
		const user = await this.findOne(userId);

		// Authorization check
		if (userId !== currentUser.id && currentUser.role !== UserRole.ADMIN) {
			throw new ForbiddenException('You are not allowed to update this user');
		}

		// Prevent non-admins from changing role
		if (currentUser.role !== UserRole.ADMIN && dto.role) {
			delete dto.role;
		}

		// Hash the password if it's being updated
		if (dto.password) {
			dto.password = await argon.hash(dto.password);
		}

		Object.assign(user, dto);
		return this.userRepo.save(user);
	}

	async deleteUser(id: number): Promise<void> {
		const result = await this.userRepo.delete(id);
		if (result.affected === 0) {
			throw new NotFoundException('User not found');
		}
	}

	private toPosInt(v: any, fallback: number) {
		const n = Number(v);
		return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
	}

	// EDIT the export method signature:
	async export(dto: ListUsersDto, limit: number, currentUser?: User): Promise<{ rows: any[] }> {
		const MAX_EXPORT = Math.min(this.toPosInt(limit, 50000), 50000);

		const qb = this.buildUsersQB({ ...dto }, currentUser); // Pass currentUser
		qb.take(MAX_EXPORT).skip(0);

		const users = await qb.getMany();

		const rows = users.map(u => ({
			id: u.id,
			email: u.email ?? '',
			role: u.role,
			project: u.project?.name ?? '',
			createdBy: u.created_by ? `User ${u.created_by}` : 'Admin', // ADD created_by info
			createdAt: u.created_at?.toISOString?.() ?? '',
			updatedAt: u.updated_at?.toISOString?.() ?? '',
			formSubmissionsCount: Array.isArray(u.formSubmissions) ? u.formSubmissions.length : 0,
		}));

		return { rows };
	}
}
