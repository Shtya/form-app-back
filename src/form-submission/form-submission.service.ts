import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FormSubmission } from 'entities/form-submissions.entity';
import { CreateFormSubmissionDto } from 'dto/form-submission.dto';
import { User, UserRole } from 'entities/user.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class FormSubmissionService {
  constructor(
    @InjectRepository(FormSubmission)
    private submissionRepo: Repository<FormSubmission>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

        private readonly httpService: HttpService, // <-- inject HttpService

  ) {}


async create(userId: number, dto: CreateFormSubmissionDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

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

    const savedSubmission = await this.submissionRepo.save(submission);

    // --- CALL EMPLOYEE SERVICE ---
    try {
      console.log(dto);
      const employeePayload = this.mapFormToEmployee(dto, user);
      console.log(`employeePayload ${JSON.stringify(employeePayload)}`);

      // Store employee ID in submission for future updates
      const response = await firstValueFrom(
        this.httpService.post(
          `${process.env.NEST_PUBLIC_BASE_URL_2}/employees/from-data`,
          employeePayload,
          {
            headers: {
              'Authorization': `Bearer ${process.env.TOKENJWT_SECRET}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      // Store employee ID in submission
      if (response.data?.success && response.data?.data?.employee?.id) {
        savedSubmission.employeeId = response.data.data.employee.id;
        await this.submissionRepo.save(savedSubmission);
      }

      console.log('Employee created in Project A:', response.data);
    } catch (error) {
      console.error('Failed to create employee in Project A:', error.response?.data || error.message);
      // You can decide to fail silently or throw
    }

    return savedSubmission;
  }

private mapFormToEmployee(dto: CreateFormSubmissionDto, user: User): Record<string, any> {
  const answers = dto.answers;
  const employeeData: Record<string, any> = {};

  // ======= COPY ALL FIELDS DIRECTLY =======
  // This ensures ALL fields from the form are included
  Object.keys(answers).forEach(key => {
    employeeData[key] = answers[key];
  });

  // ======= ADD SPECIFIC FIELD MAPPINGS =======
  // Personal Information
  employeeData.employeeName = answers['employeeName'] || answers['fullName'] || answers['name'] || answers['اسم_الموظف'];
  employeeData.fullName = answers['fullName'] || answers['employeeName'] || answers['name'] || answers['اسم_الموظف'];
  employeeData.name = answers['name'] || answers['fullName'] || answers['employeeName'] || answers['اسم_الموظف'];
  employeeData.اسم_الموظف = answers['اسم_الموظف'] || answers['fullName'] || answers['employeeName'];

  // CRITICAL: Age field - use lowercase 'age' from form
  employeeData.Age = answers['age'] || answers['Age'] || answers['العمر'];
  employeeData.age = answers['age'] || answers['Age'] || answers['العمر'];
  employeeData.العمر = answers['العمر'] || answers['age'] || answers['Age'];

  // Passport fields from your form
  employeeData.passportNumber = answers['passportNumber'];
  employeeData.passportIssueDate = answers['passportIssueDate'];
  employeeData.passportExpiryDate = answers['passportExpiryDate'];
  employeeData.birthPlace = answers['birthPlace'];
  employeeData.idIssuePlace = answers['idIssuePlace'];

  // Other fields
  employeeData.nationality = answers['nationality'] || answers['الجنسية'];
  employeeData.الجنسية = answers['الجنسية'] || answers['nationality'];

  employeeData.idNumber = answers['idNumber'] || answers['رقم_الهوية'];
  employeeData.رقم_الهوية = answers['رقم_الهوية'] || answers['idNumber'];

  employeeData.email = answers['email'] || answers['البريد_الإلكتروني'];
  employeeData.البريد_الإلكتروني = answers['البريد_الإلكتروني'] || answers['email'];

  employeeData.birthDate = answers['birthDate'] || answers['تاريخ_الميلاد'];
  employeeData.تاريخ_الميلاد = answers['تاريخ_الميلاد'] || answers['birthDate'];

  employeeData.mobileNumber = answers['mobileNumber'] || answers['رقم_الجوال'] || answers['رقم-الهاتف'];
  employeeData.رقم_الجوال = answers['رقم_الجوال'] || answers['mobileNumber'] || answers['رقم-الهاتف'];

  // Employment Information
  employeeData.joiningDate = answers['joiningDate'] || answers['تاريخ_الالتحاق'];
  employeeData.تاريخ_الالتحاق = answers['تاريخ_الالتحاق'] || answers['joiningDate'];

  // Banking
  employeeData.bankIban = answers['bankIban'] || answers['رقم_الايبان'];
  employeeData.رقم_الايبان = answers['رقم_الايبان'] || answers['bankIban'];

  employeeData.bankName = answers['bankName'] || answers['اسم_البنك'];
  employeeData.اسم_البنك = answers['اسم_البنك'] || answers['bankName'];

  // Additional Information
  employeeData.projectName = user.project?.name || answers['projectName'] || answers['اسم_المشروع'];
  employeeData.اسم_المشروع = answers['اسم_المشروع'] || user.project?.name;

  employeeData.specialization = answers['specialization'] || answers['التخصص'];
  employeeData.التخصص = answers['التخصص'] || answers['specialization'];

  employeeData.idExpiryDate = answers['idExpiryDate'] || answers['تاريخ_انتهاء_الهوية'];
  employeeData.تاريخ_انتهاء_الهوية = answers['تاريخ_انتهاء_الهوية'] || answers['idExpiryDate'];

  employeeData.address = answers['address'] || answers['العنوان'];
  employeeData.العنوان = answers['العنوان'] || answers['address'];

  employeeData.city = answers['city'] || answers['المدينة'];
  employeeData.المدينة = answers['المدينة'] || answers['city'];

  employeeData.religion = answers['religion'] || answers['الديانة'];
  employeeData.الديانة = answers['الديانة'] || answers['religion'];

  employeeData.maritalStatus = answers['maritalStatus'] || answers['الحالة_الاجتماعية'];
  employeeData.الحالة_الاجتماعية = answers['الحالة_الاجتماعية'] || answers['maritalStatus'];

  employeeData.degree = answers['degree'] || answers['المؤهل'];
  employeeData.المؤهل = answers['المؤهل'] || answers['degree'];

  employeeData.gender = answers['gender'] || answers['الجنس'];
  employeeData.الجنس = answers['الجنس'] || answers['gender'];

  // Document fields (with dashes)
  employeeData['passport-photo-copy'] = answers['passport-photo-copy'];
  employeeData['السيرة-الذاتية-'] = answers['السيرة-الذاتية-'];
  employeeData['الشهادة-العلمية-'] = answers['الشهادة-العلمية-'];
  employeeData['شهادة-الايبان-البنكي'] = answers['شهادة-الايبان-البنكي'];
  employeeData['العنوان-الوطني---national-address'] = answers['العنوان-الوطني---national-address'];

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
	// async findAllForAdmin(page = 1, limit = 10, form_id?: string, project_id?: string) {
	// 	const query = this.submissionRepo
	// 		.createQueryBuilder('submission')
	// 		.leftJoinAndSelect('submission.user', 'user')
	// 		.leftJoinAndSelect('user.project', 'project')
	// 		.leftJoinAndSelect('submission.form', 'form')   // ✅ الأفضل لو relation موجود
	// 		.where('form.adminId IS NULL')
	// 		.orderBy('submission.created_at', 'DESC')
	// 		.skip((page - 1) * limit)
	// 		.take(limit);

	// 	if (form_id) query.andWhere('submission.form_id = :form_id', { form_id });

	// 	if (project_id) query.andWhere('project.id = :project_id', { project_id: +project_id });

	// 	const [data, total] = await query.getManyAndCount();
	// 	return { data, total, page, lastPage: Math.ceil(total / limit) };
	// }

	async findAllForAdmin(page = 1, limit = 10, form_id?: string, project_id?: string) {
		// const query = this.submissionRepo
		// 	.createQueryBuilder('submission')
		// 	.leftJoinAndSelect('submission.user', 'user')
		// 	.leftJoinAndSelect('user.project', 'project')
		// 	.leftJoin('form', 'form', 'CAST(form.id AS TEXT) = submission.form_id') // FIX: Cast to text
		// 	.where('form.adminId IS NULL')
		// 	.orderBy('submission.created_at', 'DESC')
		// 	.skip((page - 1) * limit)
		// 	.take(limit);
		const query = this.submissionRepo
			.createQueryBuilder('submission')
			.leftJoinAndSelect('submission.user', 'user')
			.leftJoinAndSelect('user.project', 'project')
			// لو عايز كمان ترجع بيانات الفورم نفسها (اختياري)
			.leftJoin('form', 'form', 'CAST(form.id AS TEXT) = submission.form_id')
			.addSelect(['form.id', 'form.adminId']) // أو addSelect('form') لو انت محتاج كل الأعمدة
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
    const found = await this.submissionRepo.findOne({
      where: { id }
    });

    if (!found) throw new NotFoundException('Submission not found');

    // --- DELETE EMPLOYEE IF EXISTS ---
    if (found.employeeId) {
      try {
        await firstValueFrom(
          this.httpService.delete(
            `${process.env.NEST_PUBLIC_BASE_URL_2}/employees/${found.employeeId}`,
            {
              headers: {
                'Authorization': `Bearer ${process.env.TOKENJWT_SECRET}`,
              },
            },
          ),
        );

        console.log(`Employee ${found.employeeId} deleted in Project A`);
      } catch (error) {
        console.error('Failed to delete employee in Project A:', error.response?.data || error.message);
        // You can decide to fail silently or throw
      }
    }

    return this.submissionRepo.remove(found);
  }

    async syncSubmissionWithEmployee(submissionId: number, employeeId: string) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId }
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    submission.employeeId = employeeId;
    return this.submissionRepo.save(submission);
  }

  // Get submission by employee ID
  async findByEmployeeId(employeeId: string) {
    return this.submissionRepo.findOne({
      where: { employeeId },
      relations: ['user'],
    });
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
    const submission = await this.submissionRepo.findOne({
      where: { id },
      relations: ['user']
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    Object.assign(submission, dto);
    const updatedSubmission = await this.submissionRepo.save(submission);

    // --- UPDATE EMPLOYEE IF EXISTS ---
    if (submission.employeeId) {
      try {
        const user = submission.user;
        const employeePayload = this.mapFormToEmployee(
          { answers: submission.answers, form_id: submission.form_id } as CreateFormSubmissionDto,
          user
        );

        const response = await firstValueFrom(
          this.httpService.patch(
            `${process.env.NEST_PUBLIC_BASE_URL_2}/employees/${submission.employeeId}`,
            employeePayload,
            {
              headers: {
                'Authorization': `Bearer ${process.env.TOKENJWT_SECRET}`,
                'Content-Type': 'application/json',
              },
            },
          ),
        );
        const supervisor = await this.userRepo.find({where:{project:{id:user.project.id},role:UserRole.SUPERVISOR}})
        console.log('Employee updated in Project A:', response.data);
      } catch (error) {
        console.error('Failed to update employee in Project A:', error.response?.data || error.message);
        // You can decide to fail silently or throw
      }
    }

    return updatedSubmission;
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


