import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon from 'argon2';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRole } from 'entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserBulkDto, CreateUserDto } from 'dto/user.dto';
import * as crypto from 'crypto';
import { Project } from 'entities/project.entity';

@Injectable()
export class AuthService {
	private readonly encryptionKey = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
	private readonly adminSecretKey = process.env.ADMIN_SECRET_KEY || 'admin-super-secret-123';

	constructor(
		@InjectRepository(User) private readonly userRepository: Repository<User>,
		@InjectRepository(Project) private readonly projectRepository: Repository<Project>,
		private jwtService: JwtService,
	) { }

	private encrypt(text: string): string {
		const iv = crypto.randomBytes(16);
		const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
		let encrypted = cipher.update(text);
		encrypted = Buffer.concat([encrypted, cipher.final()]);
		return iv.toString('hex') + ':' + encrypted.toString('hex');
	}

	private decrypt(encryptedText: string): string {
		const textParts = encryptedText.split(':');
		const iv = Buffer.from(textParts.shift(), 'hex');
		const encryptedData = Buffer.from(textParts.join(':'), 'hex');
		const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
		let decrypted = decipher.update(encryptedData);
		decrypted = Buffer.concat([decrypted, decipher.final()]);
		return decrypted.toString();
	}

	async createUser(dto: any, creator?: any) {
		const emailExists = await this.userRepository.findOne({
			where: { email: dto.email },
		});
		if (emailExists) throw new BadRequestException('User already exists');

		const password = dto.password || this.generateRandomPassword();
		const hash = await argon.hash(password);
		const encryptedPassword = this.encrypt(password);

		// 🟢 تحقق من وجود المشروع
		const project = await this.projectRepository.findOne({ where: { id: dto.projectId } });
		if (!project) {
			throw new BadRequestException('Project not found');
		}

		let created_by: number | null = null;

		if (creator) {
			if (creator.role === UserRole.SUPERVISOR) {
				created_by = creator.id;
			} else if (creator.role === UserRole.ADMIN) {
				created_by = null;
			}
		}

		const user = this.userRepository.create({
			...dto,
			form_id: dto.formId,
			created_by,
			password: hash,
			encryptedPassword,
			project,
		});

		const savedUser: any = await this.userRepository.save(user);

		return {
			id: savedUser.id,
			email: savedUser.email,
			role: savedUser.role,
			projectId: savedUser.project?.id,
			form_id: dto.formId,
			created_at: Date.now(),
			...(!dto.password && { generatedPassword: password }),
			message: 'User created successfully.',
		};
	}

	async createUsersBulk(dtos: any[], creator?: any) {
		const results = [];

		let created_by: number | null = null;

		if (creator) {
			if (creator.role === UserRole.SUPERVISOR) {
				created_by = creator.id;
			} else if (creator.role === UserRole.ADMIN) {
				created_by = null;
			}
		}

		for (const dto of dtos) {
			if (!dto.email || !dto.role || !dto.projectName) {
				results.push({
					email: dto.email || '(missing email)',
					status: 'failed',
					reason: `Missing required fields: ${[!dto.email ? 'email' : '', !dto.role ? 'role' : '', !dto.projectName ? 'projectName' : ''].filter(Boolean).join(', ')}`,
				});
				continue;
			}

			if (!Object.values(UserRole).includes(dto.role as UserRole)) {
				results.push({
					email: dto.email,
					status: 'failed',
					reason: `Invalid role "${dto.role}". Allowed roles: ${Object.values(UserRole).join(', ')}`,
				});
				continue;
			}

			const emailExists = await this.userRepository.findOne({ where: { email: dto.email } });
			if (emailExists) {
				results.push({
					email: dto.email,
					status: 'failed',
					reason: `Email "${dto.email}" already exists`,
				});
				continue;
			}

			// ✅ تحقق من وجود المشروع أو أنشئه
			let project = await this.projectRepository.findOne({ where: { name: dto.projectName } });
			if (!project) {
				project = this.projectRepository.create({ name: dto.projectName });
				project = await this.projectRepository.save(project);
			}

			// ✅ تجهيز كلمة المرور
			const password = dto.password || this.generateRandomPassword();
			const hash = await argon.hash(password);
			const encryptedPassword = this.encrypt(password);

			// ✅ إنشاء المستخدم
			const user = this.userRepository.create({
				email: dto.email,
				password: hash,
				encryptedPassword,
				created_by,
				role: dto.role,
				project,
			} as any);

			try {
				const savedUser: any = await this.userRepository.save(user);
				results.push({
					email: savedUser.email,
					id: savedUser.id,
					role: dto.role,
					created_at: savedUser.created_at,
					status: 'success',
					generatedPassword: !dto.password ? password : undefined,
					projectName: savedUser.project.name,
				});
			} catch (err) {
				results.push({
					email: dto.email,
					status: 'failed',
					reason: 'Database error',
				});
			}
		}

		return {
			message: 'Bulk user creation completed',
			results,
		};
	}

	private generateRandomPassword(length = 12): string {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
		let password = '';
		for (let i = 0; i < length; i++) {
			password += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return password;
	}

	async getMe(id: number) {
		return await this.userRepository.findOne({ where: { id } });
	}

	// auth.service.ts
	async verifyAndGetUserCredentials(requestingUserId: number, targetUserId: number) {
		// Get the requesting user to verify admin role
		const requestingUser = await this.userRepository.findOne({
			where: { id: requestingUserId },
		});

		if (!requestingUser) {
			throw new UnauthorizedException('Requesting user not found');
		}

		// Only allow admins to access this functionality
		if (requestingUser.role !== UserRole.ADMIN) {
			throw new UnauthorizedException('Insufficient permissions');
		}

		// Get the target user
		const targetUser = await this.userRepository.findOne({
			where: { id: targetUserId },
		});

		if (!targetUser) {
			throw new BadRequestException('Target user not found');
		}

		if (!targetUser.encryptedPassword) {
			throw new BadRequestException('Password not recoverable for this user');
		}

		return {
			id: targetUser.id,
			name: targetUser.email,
			role: targetUser.role,
			password: this.decrypt(targetUser.encryptedPassword),
		};
	}

	async signup(dto: { email: string; password: string; name?: string }) {
		const emailExists = await this.userRepository.findOne({
			where: { email: dto.email },
		});
		if (emailExists) throw new BadRequestException('Email already exists');

		const hash = await argon.hash(dto.password);
		const encryptedPassword = this.encrypt(dto.password);

		const user = this.userRepository.create({
			...dto,
			password: hash,
			encryptedPassword,
			role: UserRole.USER,
		});

		const savedUser = await this.userRepository.save(user);

		return {
			id: savedUser.id,
			name: savedUser.email,
			role: savedUser.role,
			message: 'Account created successfully.',
		};
	}

	async signin(email: string, password: string) {
		const user = await this.userRepository.findOne({ where: { email } });
		if (!user) throw new UnauthorizedException('Invalid credentials');

		const passwordValid = await argon.verify(user.password, password);
		if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

		const accessToken = await this.generateAccessToken(user);
		const refreshToken = await this.generateRefreshToken(user);

		return {
			id: user.id,
			name: user.email,
			role: user.role,
			formId: user?.form_id,
			accessToken,
			refreshToken,
		};
	}

	async refreshAccessToken(refreshToken: string) {
		if (!refreshToken) throw new BadRequestException('Refresh token is required');

		try {
			const payload = await this.jwtService.verifyAsync(refreshToken, {
				secret: process.env.JWT_REFRESH_SECRET,
			});

			const user = await this.userRepository.findOne({
				where: { id: payload.sub },
			});
			if (!user) throw new UnauthorizedException('User not found');

			return {
				accessToken: await this.generateAccessToken(user),
			};
		} catch (error) {
			if (error.name === 'TokenExpiredError') {
				throw new UnauthorizedException('Refresh token expired');
			}
			throw new UnauthorizedException('Invalid refresh token');
		}
	}

	private async generateAccessToken(user: User): Promise<string> {
		const payload = {
			sub: user.id,
			email: user.email,
			role: user.role,
		};
		return this.jwtService.signAsync(payload, {
			secret: process.env.JWT_SECRET,
			expiresIn: process.env.JWT_EXPIRE || '15m',
		});
	}

	private async generateRefreshToken(user: User): Promise<string> {
		const payload = {
			sub: user.id,
			email: user.email,
		};
		return this.jwtService.signAsync(payload, {
			secret: process.env.JWT_REFRESH_SECRET,
			expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
		});
	}
}
