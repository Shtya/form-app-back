import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { In, Repository } from 'typeorm';
import { FormSubmission, SubmissionStatus } from 'entities/form-submissions.entity';
import { CreateFormSubmissionDto } from 'dto/form-submission.dto';
import { User, UserRole } from 'entities/user.entity';
import { Form, ApprovalFlow } from 'entities/forms.entity';

@Injectable()
export class FormSubmissionService {
	constructor(
		@InjectRepository(FormSubmission)
		private submissionRepo: Repository<FormSubmission>,

		@InjectRepository(User)
		private userRepo: Repository<User>,

		@InjectRepository(Form)
		private formRepo: Repository<Form>,

		private readonly httpService: HttpService,
	) { }

	async create(userId: number, dto: CreateFormSubmissionDto) {
		const user = await this.userRepo.findOne({
			where: { id: userId },
			relations: ['project']
		});
		if (!user) throw new NotFoundException('User not found');

    const existing = await this.submissionRepo.findOne({
      where: { user: { id: userId , } }
    });
    const form = await this.formRepo.findOne({ 
        where: { id: parseInt(dto.form_id) },
        relations: ['fields']
    });
    if (!form) throw new NotFoundException('Form not found');
    
    if (existing && form.type === 'project') {
      throw new BadRequestException('You have already submitted this form.');
    }

    // Fetch form to check approval flow
    let status = SubmissionStatus.PENDING;


    const submission = this.submissionRepo.create({
      user,
      answers: dto.answers,
      form_id: dto.form_id,
      status: status,
    });

		const savedSubmission = await this.submissionRepo.save(submission);

    // --- CALL EXTERNAL SERVICE ---
    try {
      if (form.type === 'employee_request') {
        const requestPayload = {
          title: form.title,
          description: form.description,
          approvalFlow: form.approvalFlow,
          projectId: user.project?.id,
          projectName: user.project?.name,
          employeeId: user.email, // using email as ID
          fields: (form.fields || []).map(f => ({
            key: f.key,
            value: String(dto.answers[f.key] || ''),
            label: f.label,
            type: f.type
          }))
        };

        const response = await firstValueFrom(
          this.httpService.post(
            `${process.env.NEST_PUBLIC_BASE_URL_2}/requests`,
            requestPayload,
            {
              headers: {
                'Authorization': `Bearer ${process.env.TOKENJWT_SECRET}`,
                'Content-Type': 'application/json',
              },
            },
          ),
        );
        console.log('Request created externally:', response.data);
      } else {
        // Handle Project/Employee Creation Flow
        console.log('Form submission data (project):', dto);
        const employeePayload = await this.mapFormToEmployee(dto, user);
        
        // Inject Workflow Status for Project Forms
        if (form?.approvalFlow) {
           const flow = form.approvalFlow;
           if (flow === ApprovalFlow.HR_ONLY) {
               employeePayload.workflowStatus = 'hr_review';
               employeePayload.isVerifiedBySupervisor = true;
           } else if (flow === ApprovalFlow.SUPERVISOR_ONLY) {
               employeePayload.workflowStatus = 'supervisor_review';
               employeePayload.isVerifiedByHr = true;
           } else if (flow === ApprovalFlow.SUPERVISOR_THEN_HR) {
               employeePayload.workflowStatus = 'supervisor_review';
               employeePayload.isVerifiedBySupervisor = false;
               employeePayload.isVerifiedByHr = false;
           } else if (flow === ApprovalFlow.HR_THEN_SUPERVISOR) {
               employeePayload.workflowStatus = 'hr_review'; // Start with HR
               employeePayload.isVerifiedBySupervisor = false;
               employeePayload.isVerifiedByHr = false;
           }
        }

        console.log(`Employee payload: ${JSON.stringify(employeePayload)}`);

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
        console.log('Employee created:', response.data);
      }
    } catch (error) {
      console.error('Failed to call external service:', error.response?.data || error.message);
    }

		return savedSubmission;
	}

	private async mapFormToEmployee(dto: CreateFormSubmissionDto, user: User) {
		const answers = dto.answers || {};

		// Fetch the form with its fields to get types and labels
		const form = await this.formRepo.findOne({
			where: { id: parseInt(dto.form_id) },
			relations: ['fields']
		});

		const personalInformation = [];

		if (form && form.fields) {
			form.fields.forEach(field => {
				const value = answers[field.key];
				// We only include fields that were actually answered
				if (value !== undefined) {
					personalInformation.push({
						key: field.key,
						value: value,
						type: field.type,
						label: field.label
					});
				}
			});
		} else {
			// Fallback: if form or fields not found, just use raw answers as keys
			Object.keys(answers).forEach(key => {
				personalInformation.push({
					key: key,
					value: answers[key],
					type: 'text', // default type
					label: key
				});
			});
		}

		const employeePayload: Record<string, any> = {
			personalInformation
		};

		// Explicitly add project name from relation if available
		if (user?.project?.name) {
			employeePayload.projectName = user.project.name;
		}
		if (user.project?.id) {
			employeePayload.ProjectId = user.project.id;
		}
		if (user.email) {
			employeePayload.Email = user.email;
		}
		return employeePayload;
	}

  async findAllForAdmin(page = 1, limit = 10, form_id?: string, project_id?: string, type?: string,search?: string) {
    const query = this.submissionRepo
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.user', 'user')
      .leftJoinAndSelect('user.project', 'project')
      .leftJoin(Form, 'form', 'CAST(form.id AS TEXT) = submission.form_id')
      .addSelect(['form.id', 'form.adminId', 'form.type'])
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

		if (search) {
			query.andWhere(
				`(user.email ILIKE :q OR project.name ILIKE :q OR CAST(submission.answers AS TEXT) ILIKE :q)`,
				{ q: `%${search}%` }
			);
		}


    if (type) {
      query.andWhere('form.type = :type', { type });
    }

		const [data, total] = await query.getManyAndCount();

		return {
			data,
			total,
			page,
			lastPage: Math.ceil(total / limit),
		};
	}

  async findAllForSupervisor(page = 1, limit = 10, supervisorId: number, form_id?: string, project_id?: string, type?: string) {
    const query = this.submissionRepo
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.user', 'user')
      .leftJoinAndSelect('user.project', 'project')
      .leftJoin(Form, 'form', 'CAST(form.id AS TEXT) = submission.form_id')
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

    if (type) {
        query.andWhere('form.type = :type', { type });
    }

		const [data, total] = await query.getManyAndCount();

		return {
			data,
			total,
			page,
			lastPage: Math.ceil(total / limit),
		};
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

  async findAllByUser(userId: number, type?: string,search?: string) {
    const whereClause: any = { user: { id: userId } };

    if (type) {
      // Find all forms of the requested type
      const forms = await this.formRepo.find({
        where: { type: type as any },
        select: ['id']
      });

      if (!forms.length) {
        return { data: [], total: 0 };
      }

      whereClause.form_id = In(forms.map(f => String(f.id)));
    }

    const data = await this.submissionRepo.find({
      where: whereClause,
      order: { created_at: 'DESC' },
    });

    return { data, total: data.length };
  }

	async findOne(id: number) {
		return this.submissionRepo.findOne({
			where: { id },
			relations: ['user'],
		});
	}

	async update(id: number, dto: any) {
		const submission = await this.submissionRepo.findOne({
			where: { id },
			relations: ['user', 'user.project']
		});

		if (!submission) {
			throw new NotFoundException('Submission not found');
		}

		Object.assign(submission, dto);
		const updatedSubmission = await this.submissionRepo.save(submission);


		return updatedSubmission;
	}

	async deleteSubmission(id: number) {
		const found = await this.submissionRepo.findOne({
			where: { id }
		});

		if (!found) throw new NotFoundException('Submission not found');



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

	async findByEmployeeId(employeeId: string) {
		return this.submissionRepo.findOne({
			where: { employeeId },
			relations: ['user'],
		});
	}

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

		// 3) build rows for upsert
		const rows: Partial<FormSubmission>[] = valid.map(s => ({
			userId: s.userId,
			form_id: s.form_id,
			answers: s.answers,
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
					status: 'upserted',
					form_id: s.form_id,
				})),
			],
		};
	}


  async approveSubmission(id: number, approverRole: UserRole) {
    const submission = await this.submissionRepo.findOne({
      where: { id },
      relations: ['user']
    });
    if (!submission) throw new NotFoundException('Submission not found');
    
    const form = await this.formRepo.findOne({ where: { id: parseInt(submission.form_id) } });

    if (!form || !form.approvalFlow || form.type !== 'employee_request') {
        submission.status = SubmissionStatus.APPROVED;
        return this.submissionRepo.save(submission);
    }

    const flow = form.approvalFlow;
    const currentStatus = submission.status;

    if (approverRole === UserRole.ADMIN) { 
        if (currentStatus === SubmissionStatus.PENDING_HR) {
            if (flow === ApprovalFlow.HR_ONLY) {
                submission.status = SubmissionStatus.APPROVED;
            } else if (flow === ApprovalFlow.HR_THEN_SUPERVISOR) {
                submission.status = SubmissionStatus.PENDING_SUPERVISOR;
            } else {
                 submission.status = SubmissionStatus.APPROVED;
            }
        } else {
             submission.status = SubmissionStatus.APPROVED;
        }
    } else if (approverRole === UserRole.SUPERVISOR) {
        if (currentStatus === SubmissionStatus.PENDING_SUPERVISOR) {
             if (flow === ApprovalFlow.SUPERVISOR_ONLY) {
                 submission.status = SubmissionStatus.APPROVED;
             } else if (flow === ApprovalFlow.SUPERVISOR_THEN_HR) {
                 submission.status = SubmissionStatus.PENDING_HR;
             } else if (flow === ApprovalFlow.HR_THEN_SUPERVISOR) {
                 submission.status = SubmissionStatus.APPROVED;
             }
        }
    }

    return this.submissionRepo.save(submission);
  }

  async rejectSubmission(id: number, reason: string) {
      const submission = await this.submissionRepo.findOne({ where: { id } });
      if (!submission) throw new NotFoundException('Submission not found');
      
      submission.status = SubmissionStatus.REJECTED;
      return this.submissionRepo.save(submission);
  }

  // Optional: Backfill method for missing userIds
  async backfillUserIdFromRelation(batchSize = 500) {
    while (true) {
      const items: FormSubmission[] = await this.submissionRepo.find({
        where: { userId: null },
        relations: ['user'],
        take: batchSize,
      });

			if (items.length === 0) break;

			for (const s of items) {
				if (s.user?.id) s.userId = s.user.id;
			}

			await this.submissionRepo.save(items);
		}

		return { message: 'Backfill completed' };
	}
}