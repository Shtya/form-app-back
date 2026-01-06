import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FormSubmission } from 'entities/form-submissions.entity';
import { CreateFormSubmissionDto } from 'dto/form-submission.dto';
import { User, UserRole } from 'entities/user.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Form } from 'entities/forms.entity';

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
  ) {}

  async create(userId: number, dto: CreateFormSubmissionDto) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['project']
    });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.submissionRepo.findOne({
      where: { user: { id: userId } }
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
      console.log('Form submission data:', dto);
      const employeePayload = await this.mapFormToEmployee(dto, user);
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

      console.log('Employee created in Project A:', response.data);
    } catch (error) {
      console.error('Failed to create employee in Project A:', error.response?.data || error.message);
      // You can decide to fail silently or throw
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
    if (user.project?.id){
      employeePayload.ProjectId = user.project.id;
    }
    if (user.email){
      employeePayload.Email = user.email;
    }
    return employeePayload;
  }

  async findAllForAdmin(page = 1, limit = 10, form_id?: string, project_id?: string) {
    const query = this.submissionRepo
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.user', 'user')
      .leftJoinAndSelect('user.project', 'project')
      .leftJoin('form', 'form', 'CAST(form.id AS TEXT) = submission.form_id')
      .addSelect(['form.id', 'form.adminId'])
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

  async findAllForSupervisor(page = 1, limit = 10, supervisorId: number, form_id?: string, project_id?: string) {
    const query = this.submissionRepo
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.user', 'user')
      .leftJoinAndSelect('user.project', 'project')
      .leftJoin('form', 'form', 'CAST(form.id AS TEXT) = submission.form_id')
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

  async findAllByUser(userId: number) {
    return this.submissionRepo.find({
      where: { user: { id: userId } },
      order: { created_at: 'DESC' },
    });
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

    if (submission.employeeId) {
      try {
        const user = submission.user;
        const employeePayload = await this.mapFormToEmployee(
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

        // Find supervisor for this project
        const supervisor = await this.userRepo.find({
          where: {
            project: { id: user.project.id },
            role: UserRole.SUPERVISOR
          }
        });

        console.log('Employee updated in Project A:', response.data);
      } catch (error) {
        console.error('Failed to update employee in Project A:', error.response?.data || error.message);
        // You can decide to fail silently or throw
      }
    }

    return updatedSubmission;
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