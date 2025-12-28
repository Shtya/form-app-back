import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormSubmission } from 'entities/form-submissions.entity';
import { CreateFormSubmissionDto } from 'dto/form-submission.dto';
import { User } from 'entities/user.entity';
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

  return employeeData;
}
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
}
