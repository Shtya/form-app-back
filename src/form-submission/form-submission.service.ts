import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async bulkCreateSubmissions(submissions: Array<{ userId: number; answers: Record<string, any>; form_id: string }>) {
    const results = [];

    for (const sub of submissions) {
      try {
        // Find user by email
        const user = await this.userRepo.findOne({ where: { id: sub.userId } });
        if (!sub.userId || isNaN(sub.userId)) {
          results.push({
            userId: sub.userId || null,
            status: 'failed',
            reason: `User with ID "${sub.userId}" not found`,
          });
          continue;
        }

        // Check if submission already exists for this user and form
        const existing = await this.submissionRepo.findOne({
          where: { user: { id: user.id }, form_id: sub.form_id },
        });

        if (existing) {
          // Update existing submission
          existing.answers = sub.answers;
          await this.submissionRepo.save(existing);
          results.push({
            userId: sub.userId,
            status: 'updated',
            submissionId: existing.id,
          });
        } else {
          // Create new submission
          const submission = this.submissionRepo.create({
            user,
            answers: sub.answers,
            form_id: sub.form_id,
          });
          const saved = await this.submissionRepo.save(submission);
          results.push({
            userId: sub.userId,
            status: 'created',
            submissionId: saved.id,
          });
        }
      } catch (error) {
        results.push({
          userId: sub.userId,
          status: 'failed',
          reason: error.message || 'Unknown error',
        });
      }
    }

    return {
      message: 'Bulk submission upload completed',
      results,
    };
  }
}
