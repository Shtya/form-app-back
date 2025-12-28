import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FormSubmission } from 'entities/form-submissions.entity';
import { CreateFormSubmissionDto } from 'dto/form-submission.dto';
import { User } from 'entities/user.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Form } from '../../entities/forms.entity';

@Injectable()
export class FormSubmissionService {
	constructor(
		@InjectRepository(FormSubmission)
		private submissionRepo: Repository<FormSubmission>,

		@InjectRepository(User)
		private userRepo: Repository<User>,

		@InjectRepository(Form) // ADD this line
		private formRepo: Repository<Form>,
	) { }

	async create(userId: number, dto: CreateFormSubmissionDto) {
		const user = await this.userRepo.findOne({ where: { id: userId } });
		if (!user) throw new NotFoundException('User not found');

		// التحقق إذا كان المستخدم قد أرسل بالفعل
		const existing = await this.submissionRepo.findOne({
			where: { user: { id: userId } },
		});

		if (existing) {
			throw new BadRequestException('You have already submitted this form.');
		}

		const submission = this.submissionRepo.create({
			user,
			answers: dto.answers,
			form_id: dto.form_id,
		});

		return this.submissionRepo.save(submission);
	}


	// EDIT the findAllForAdmin method - change the join:
	async findAllForAdmin(page = 1, limit = 10, form_id?: string, project_id?: string) {
		const query = this.submissionRepo
			.createQueryBuilder('submission')
			.leftJoinAndSelect('submission.user', 'user')
			.leftJoinAndSelect('user.project', 'project')
			.leftJoin('form', 'form', 'CAST(form.id AS TEXT) = submission.form_id') // FIX: Cast to text
			.where('form.adminId IS NULL')
			.orderBy('submission.created_at', 'DESC')
			.skip((page - 1) * limit)
			.take(limit);

		if (form_id) {
			query.andWhere('submission.form_id = :form_id', { form_id });
		}

		if (project_id) {
			query.andWhere('project.id = :project_id', { project_id: +project_id });
		}

		const [data, total] = await query.getManyAndCount();

		return {
			data,
			total,
			page,
			lastPage: Math.ceil(total / limit),
		};
	}

	// EDIT the findAllForSupervisor method - same fix:
	async findAllForSupervisor(page = 1, limit = 10, supervisorId: number, form_id?: string, project_id?: string) {
		const query = this.submissionRepo
			.createQueryBuilder('submission')
			.leftJoinAndSelect('submission.user', 'user')
			.leftJoinAndSelect('user.project', 'project')
			.leftJoin('form', 'form', 'CAST(form.id AS TEXT) = submission.form_id') // FIX: Cast to text
			.where('form.adminId = :supervisorId', { supervisorId })
			.orderBy('submission.created_at', 'DESC')
			.skip((page - 1) * limit)
			.take(limit);

		if (form_id) {
			query.andWhere('submission.form_id = :form_id', { form_id });
		}

		if (project_id) {
			query.andWhere('project.id = :project_id', { project_id: +project_id });
		}

		const [data, total] = await query.getManyAndCount();

		return {
			data,
			total,
			page,
			lastPage: Math.ceil(total / limit),
		};
	}

	async findAllByUser(userId: number) {
		return this.submissionRepo.find({
			where: { user: { id: userId } },
			order: { created_at: 'DESC' },
		});
	}

	async deleteSubmission(id: number) {
		const found = await this.submissionRepo.findOne({ where: { id } });
		if (!found) throw new NotFoundException('Submission not found');

		return this.submissionRepo.remove(found);
	}

	async findAll(page = 1, limit = 10, form_id?: string, project_id?: string) {
		const query = this.submissionRepo
			.createQueryBuilder('submission')
			.leftJoinAndSelect('submission.user', 'user')
			.leftJoinAndSelect('user.project', 'project')
			.orderBy('submission.created_at', 'DESC')
			.skip((page - 1) * limit)
			.take(limit);

		if (form_id) {
			query.andWhere('submission.form_id = :form_id', { form_id });
		}

		if (project_id) {
			query.andWhere('project.id = :project_id', { project_id: +project_id });
		}

		const [data, total] = await query.getManyAndCount();

		return {
			data,
			total,
			page,
			lastPage: Math.ceil(total / limit),
		};
	}

	async update(id: number, dto: any) {
		const submission = await this.submissionRepo.findOne({ where: { id }, relations: ['user'] });

		if (!submission) {
			throw new NotFoundException('Submission not found');
		}

		Object.assign(submission, dto);
		return this.submissionRepo.save(submission);
	}

	findOne(id: number) {
		return this.submissionRepo.findOne({
			where: { id },
			relations: ['user'],
		});
	}

	// async bulkCreateSubmissions(submissions: Array<{ userId: number; answers: Record<string, any>; form_id: string }>) {
	//   const results = [];

	//   for (const sub of submissions) {
	//     try {
	//       // Find user by email
	//       const user = await this.userRepo.findOne({ where: { id: sub.userId } });
	//       if (!sub.userId || isNaN(sub.userId)) {
	//         results.push({
	//           userId: sub.userId || null,
	//           status: 'failed',
	//           reason: `User with ID "${sub.userId}" not found`,
	//         });
	//         continue;
	//       }

	//       // Check if submission already exists for this user and form
	//       const existing = await this.submissionRepo.findOne({
	//         where: { user: { id: user.id }, form_id: sub.form_id },
	//       });

	//       if (existing) {
	//         // Update existing submission
	//         existing.answers = sub.answers;
	//         await this.submissionRepo.save(existing);
	//         results.push({
	//           userId: sub.userId,
	//           status: 'updated',
	//           submissionId: existing.id,
	//         });
	//       } else {
	//         // Create new submission
	//         const submission = this.submissionRepo.create({
	//           user,
	//           answers: sub.answers,
	//           form_id: sub.form_id,
	//         });
	//         const saved = await this.submissionRepo.save(submission);
	//         results.push({
	//           userId: sub.userId,
	//           status: 'created',
	//           submissionId: saved.id,
	//         });
	//       }
	//     } catch (error) {
	//       results.push({
	//         userId: sub.userId,
	//         status: 'failed',
	//         reason: error.message || 'Unknown error',
	//       });
	//     }
	//   }

	//   return {
	//     message: 'Bulk submission upload completed',
	//     results,
	//   };
	// }


	private chunk<T>(arr: T[], size: number): T[][] {
		const res: T[][] = [];
		for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
		return res;
	}

	async bulkCreateSubmissions(
		submissions: Array<{ userId: number; answers: Record<string, any>; form_id: string }>,
	) {
		if (!Array.isArray(submissions) || submissions.length === 0) {
			throw new BadRequestException('submissions must be a non-empty array');
		}

		// 1) validate input
		const normalized = submissions.map((s) => ({
			userId: Number(s.userId),
			form_id: String(s.form_id),
			answers: s.answers ?? {},
		}));

		const invalid = normalized.filter(s => !Number.isFinite(s.userId) || s.userId <= 0 || !s.form_id);
		if (invalid.length) {
			return {
				message: 'Bulk submission upload completed',
				totalReceived: submissions.length,
				totalUpserted: 0,
				totalFailed: invalid.length,
				results: invalid.map(s => ({
					userId: s.userId || null,
					status: 'failed',
					reason: 'Invalid userId or form_id',
				})),
			};
		}

		// 2) load users in one query
		const userIds = [...new Set(normalized.map(s => s.userId))];
		const users: User[] = await this.userRepo.find({ where: { id: In(userIds) } });
		const existingUserIds = new Set(users.map(u => u.id));

		const missingUsers = normalized.filter(s => !existingUserIds.has(s.userId));
		const valid = normalized.filter(s => existingUserIds.has(s.userId));

		// 3) build rows for upsert (use userId column, not relation)
		const rows: Partial<FormSubmission>[] = valid.map(s => ({
			userId: s.userId,
			form_id: s.form_id,
			answers: s.answers,
			// isCheck: false, // لو عايز تثبت قيمة معينة أثناء الرفع
		}));

		// 4) upsert in chunks (fast)
		const CHUNK_SIZE = 200;
		for (const part of this.chunk(rows, CHUNK_SIZE)) {
			await this.submissionRepo.upsert(part, {
				conflictPaths: ['userId', 'form_id'],
			});
		}

		return {
			message: 'Bulk submission upload completed',
			totalReceived: submissions.length,
			totalUpserted: valid.length,
			totalFailed: missingUsers.length,
			results: [
				...missingUsers.map(s => ({
					userId: s.userId,
					status: 'failed',
					reason: `User with ID "${s.userId}" not found`,
				})),
				...valid.map(s => ({
					userId: s.userId,
					status: 'upserted', // created or updated
					form_id: s.form_id,
				})),
			],
		};
	}



// 	async backfillUserIdFromRelation(batchSize = 500) {
//   while (true) {
//     const items: FormSubmission[] = await this.submissionRepo.find({
//       where: { userId: null },
//       relations: ['user'],
//       take: batchSize,
//     });

//     if (items.length === 0) break;

//     for (const s of items) {
//       if (s.user?.id) s.userId = s.user.id;
//     }

//     await this.submissionRepo.save(items);
//   }

//   return { message: 'Backfill completed' };
// }

}
