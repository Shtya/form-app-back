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
      const employeePayload = this.mapFormToEmployee(dto, user);
      const response = await firstValueFrom(
        this.httpService.post(
          `${process.env.NEST_PUBLIC_BASE_URL_2}/employees/from-data`,
          employeePayload,
          {
            headers: {
              'Authorization': `Bearer ${process.env.TOKENJWT_SECRET}`, // service token
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      // Optionally handle response
      console.log('Employee created in Project A:', response.data);
    } catch (error) {
      console.error('Failed to create employee in Project A:', error.response?.data || error.message);
      // You can decide to fail silently or throw
    }

    return savedSubmission;
  }

private mapFormToEmployee(dto: CreateFormSubmissionDto, user: User): Record<string, any> {
  const answers = dto.answers;

  const employeeData: Record<string, any> = {
    // ======= PERSONAL INFORMATION =======
    employeeName: answers['employeeName'] || answers['fullName'] || answers['name'] || answers['اسم_الموظف'],
    fullName: answers['fullName'] || answers['employeeName'] || answers['name'] || answers['اسم_الموظف'],
    name: answers['name'] || answers['fullName'] || answers['employeeName'] || answers['اسم_الموظف'],
    اسم_الموظف: answers['اسم_الموظف'] || answers['fullName'] || answers['employeeName'],

    nationality: answers['nationality'] || answers['الجنسية'],
    الجنسية: answers['الجنسية'] || answers['nationality'],

    idNumber: answers['idNumber'] || answers['رقم_الهوية'],
    رقم_الهوية: answers['رقم_الهوية'] || answers['idNumber'],

    email: answers['email'] || answers['البريد_الإلكتروني'],
    البريد_الإلكتروني: answers['البريد_الإلكتروني'] || answers['email'],

    birthDate: answers['birthDate'] || answers['تاريخ_الميلاد'],
    تاريخ_الميلاد: answers['تاريخ_الميلاد'] || answers['birthDate'],

    mobileNumber: answers['mobileNumber'] || answers['رقم_الجوال'],
    رقم_الجوال: answers['رقم_الجوال'] || answers['mobileNumber'],

    // ======= EMPLOYMENT INFORMATION =======
    jobTitle: answers['jobTitle'] || answers['المسمى_الوظيفي'],
    المسمى_الوظيفي: answers['المسمى_الوظيفي'] || answers['jobTitle'],

    department: answers['department'] || answers['القسم'],
    القسم: answers['القسم'] || answers['department'],

    joiningDate: answers['joiningDate'] || answers['تاريخ_الالتحاق'],
    تاريخ_الالتحاق: answers['تاريخ_الالتحاق'] || answers['joiningDate'],

    workLocation: answers['workLocation'],
    contractType: answers['contractType'],
    salaryType: answers['salaryType'],
    Age : answers['age'] || answers['العمر'],
    // ======= SALARY/BANKING INFORMATION =======
    salary: answers['salary'],
    bankIban: answers['bankIban'] || answers['رقم_الايبان'],
    رقم_الايبان: answers['رقم_الايبان'] || answers['bankIban'],

    bankName: answers['bankName'] || answers['اسم_البنك'],
    اسم_البنك: answers['اسم_البنك'] || answers['bankName'],

    // ======= ADDITIONAL INFORMATION =======
    projectName: user.project?.name || answers['projectName'] || answers['اسم_المشروع'],
    اسم_المشروع: answers['اسم_المشروع'] || user.project?.name,

    specialization: answers['specialization'] || answers['التخصص'],
    التخصص: answers['التخصص'] || answers['specialization'],

    idExpiryDate: answers['idExpiryDate'] || answers['تاريخ_انتهاء_الهوية'],
    تاريخ_انتهاء_الهوية: answers['تاريخ_انتهاء_الهوية'] || answers['idExpiryDate'],

    address: answers['address'] || answers['العنوان'],
    العنوان: answers['العنوان'] || answers['address'],

    city: answers['city'] || answers['المدينة'],
    المدينة: answers['المدينة'] || answers['city'],

    religion: answers['religion'] || answers['الديانة'],
    الديانة: answers['الديانة'] || answers['religion'],

    maritalStatus: answers['maritalStatus'] || answers['الحالة_الاجتماعية'],
    الحالة_الاجتماعية: answers['الحالة_الاجتماعية'] || answers['maritalStatus'],

    degree: answers['degree'] || answers['المؤهل'],
    المؤهل: answers['المؤهل'] || answers['degree'],

    gender: answers['gender'] || answers['الجنس'],
    الجنس: answers['الجنس'] || answers['gender'],

    emergencyContactName: answers['emergencyContactName'],
    emergencyContactPhone: answers['emergencyContactPhone'],
    emergencyContactRelationship: answers['emergencyContactRelationship'],

    workSchedule: answers['workSchedule'],
    workHoursDaily: answers['workHoursDaily'],
    contractStatus: answers['contractStatus'],
    notes: answers['notes'] || answers['ملاحظات'],
    ملاحظات: answers['ملاحظات'] || answers['notes'],
  };
    const imageMappings = {
    IDDocumentUrl: ['idDocument', 'idDocument_asset'],
    PassportPhotoCopyUrl: ['passport-photo-copy', 'passportPhotoCopy_asset'],
    CVUrl: ['السيرة-الذاتية-', 'السيرة_الذاتية_asset'],
    DegreeCertificateUrl: ['الشهادة-العلمية-', 'الشهادة_العلمية_asset'],
    IBANCertificateUrl: ['شهادة-الايبان-البنكي', 'شهادة_الايبان_البنكي_asset'],
    NationalAddressUrl: ['العنوان-الوطني---national-address', 'nationalAddress_asset']
  };
    Object.entries(imageMappings).forEach(([entityField, inputFields]) => {
    for (const field of inputFields) {
      if (answers[field]) {
        employeeData[field] = answers[field];
        break;
      }
    }
  });

  // Handle additional documents
  const allAnswers = Object.entries(answers);
  const documentAssets = allAnswers
    .filter(([key, value]) => key.includes('_asset') && value && typeof value === 'object')
    .map(([key, value]) => value);

  if (documentAssets.length > 0) {
    employeeData.additionalDocuments = documentAssets;
  }

  // Add project information if available
  if (user.project) {
    employeeData.projectName = user.project.name;
  }

  return employeeData;

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
}
