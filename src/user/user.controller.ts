import { Controller, Get, Param, Patch, Body, Delete, UseGuards, Req, Query, Res } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from 'dto/user.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from 'entities/user.entity';
import { ListUsersDto } from './user.dto';

@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UserController {
	constructor(private readonly userService: UserService) { }

	@Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
	@Get()
	async getAllUsers(@Query() query: ListUsersDto, @Req() req: any) {
		const currentUser = req.user; // Get current user
		return this.userService.findAll(query, currentUser);
	}

	@Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
	async exportUsers(@Query() query: ListUsersDto, @Res() res: any, @Req() req: any) {
		const currentUser = req.user;
		const raw = Number((query as any).limit);
		const limit = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 50000; // hard default

		const { rows } = await this.userService.export(query, limit, currentUser);

		const header = ['id', 'email', 'role', 'project', 'createdAt', 'updatedAt', 'formSubmissionsCount'];
		const esc = (v: any) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
		const lines = [header.join(','), ...rows.map(r => header.map(h => esc(r[h])).join(','))];
		const csv = '\uFEFF' + lines.join('\n');
		const filename = `users_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;

		res.setHeader('Content-Type', 'text/csv; charset=utf-8');
		res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
		res.send(csv);
	}

	@Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
	@Get(':id')
	async getUser(@Param('id') id: string) {
		return this.userService.findOne(+id);
	}

	@Patch('profile')
	async updateProfile(@Req() req: any, @Body() dto: UpdateUserDto) {
		return this.userService.updateUser(req.user.id, dto, req.user);
	}

	@Patch(':id')
	@Roles(UserRole.ADMIN, UserRole.SUPERVISOR) // Assuming you have some role-based guard
	async updateUserById(@Param('id') userId: number, @Body() dto: UpdateUserDto, @Req() req: any) {
		return this.userService.updateUser(userId, dto, req.user);
	}

	@Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
	@Delete(':id')
	async deleteUser(@Param('id') id: string) {
		return this.userService.deleteUser(+id);
	}
}
