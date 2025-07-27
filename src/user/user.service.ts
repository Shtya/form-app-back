import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'entities/user.entity';
import { UpdateUserDto } from 'dto/user.dto';
import { UserRole } from 'entities/user.entity';
import * as argon from 'argon2';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(page = 1, limit = 10): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.userRepo.findAndCount({
      relations: ['formSubmissions'],
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'DESC' }, // يمكنك التعديل على الترتيب حسب الحاجة
    });

    return {
      data,
      total,
      page,
      limit,
    };
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
}
