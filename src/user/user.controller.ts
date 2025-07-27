import { Controller, Get, Param, Patch, Body, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from 'dto/user.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from 'entities/user.entity';

@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(UserRole.ADMIN)
  @Get()
  async getAllUsers(@Query('page') page = 1, @Query('limit') limit = 10,) {
  return this.userService.findAll(Number(page), Number(limit));
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch('profile')
  async updateProfile(@Req() req: any, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(req.user.id, dto, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN) // Assuming you have some role-based guard
  async updateUserById(@Param('id') userId: number, @Body() dto: UpdateUserDto, @Req() req: any) {
    return this.userService.updateUser(userId, dto, req.user);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(+id);
  }
}
