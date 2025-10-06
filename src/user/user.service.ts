import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { User } from 'entities/user.entity';
import { UpdateUserDto } from 'dto/user.dto';
import { UserRole } from 'entities/user.entity';
import * as argon from 'argon2';
import { ListUsersDto } from './user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private buildUsersQB(dto: ListUsersDto): SelectQueryBuilder<User> {
    const qb = this.userRepo
      .createQueryBuilder('u') // avoid alias "user"
      .leftJoinAndSelect('u.formSubmissions', 'fs')
      .leftJoinAndSelect('u.project', 'p') // project is eager anyway, but join for search on p.name
      .orderBy('u.id', 'DESC');

    // SEARCH: only on existing columns (email) + project name
    if (dto.search) {
      qb.andWhere(`(u.email ILIKE :q OR p.name ILIKE :q)`, { q: `%${dto.search}%` });
    }

    // ROLE
    if (dto.role) {
      qb.andWhere('u.role = :role', { role: dto.role });
    }

    // DATE RANGE: use created_at from your entity
    if (dto.from) {
      qb.andWhere('u.created_at >= :from', { from: dto.from });
    }
    if (dto.to) {
      qb.andWhere('u.created_at <= :to', { to: dto.to });
    }

    return qb;
  }

  async findAll(dto: ListUsersDto): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;

    const qb = this.buildUsersQB(dto)
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

  async export(dto: ListUsersDto, limit: number): Promise<{ rows: any[] }> {
    // final, defensive clamp
    const MAX_EXPORT = Math.min(this.toPosInt(limit, 50000), 50000);

    const qb = this.buildUsersQB({ ...dto }); // filters only
    qb.take(MAX_EXPORT).skip(0); // numbers only, never NaN

    const users = await qb.getMany();

    const rows = users.map(u => ({
      id: u.id,
      email: u.email ?? '',
      role: u.role,
      project: u.project?.name ?? '',
      createdAt: u.created_at?.toISOString?.() ?? '',
      updatedAt: u.updated_at?.toISOString?.() ?? '',
      formSubmissionsCount: Array.isArray(u.formSubmissions) ? u.formSubmissions.length : 0,
    }));

    return { rows };
  }
}
