import * as dotenv from 'dotenv';
dotenv.config();

import { FieldType, FormField } from 'entities/form-field.entity';
import { FormSubmission } from 'entities/form-submissions.entity';
import { Form } from 'entities/forms.entity';
import { User, UserRole } from 'entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import * as argon from 'argon2';
import { Asset } from 'entities/assets.entity';
import * as crypto from 'crypto';
import { Project } from 'entities/project.entity';


const encrypt = (text: string, encryptionKey: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

// Password generator helper
const generateRandomPassword = (length = 12): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};


export const seedUsers = async (dataSource: DataSource) => {
  const userRepository = dataSource.getRepository(User);
  const projectRepository = dataSource.getRepository(Project);

  // First create some projects if they don't exist
  const projects = await projectRepository.save([{ name: 'Project Alpha' }, { name: 'Project Beta' }, { name: 'Project Gamma' }]);

  // Admin user
  const adminPassword = process.env.ADMIN_PASS || 'admin123';
  const adminHashPass = await argon.hash(adminPassword);
  const adminEncryptedPassword = encrypt(adminPassword, process.env.ENCRYPTION_KEY || '12345678901234567890123456789012');

  // Regular users data
  const domains = ['example.com', 'test.org', 'demo.net', 'company.io'];
  const firstNames = ['John', 'Jane', 'Alex', 'Sarah', 'Mike', 'Emily', 'David', 'Lisa', 'Chris', 'Anna'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson'];

  const users = [
    // Admin user
    {
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: adminHashPass,
      encryptedPassword: adminEncryptedPassword,
      role: UserRole.ADMIN,
      name: 'System Admin',
      project: projects[0], // Assign to first project
    },
    // Regular users
    ...(await Promise.all(
      Array.from({ length: 10 }).map(async (_, i) => {
        const firstName = firstNames[i];
        const lastName = lastNames[i];
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domains[i % domains.length]}`;
        const password = generateRandomPassword();
        const hash = await argon.hash(password);
        const encryptedPassword = encrypt(password, process.env.ENCRYPTION_KEY || '12345678901234567890123456789012');

        return {
          email,
          password: hash,
          encryptedPassword,
          role: UserRole.USER,
          name: `${firstName} ${lastName}`,
          project: projects[i % projects.length], // Distribute across projects
        };
      }),
    )),
  ];

  await userRepository.save(users);
  console.log(`✅ Seeded ${users.length} users (1 admin + 10 regular users)`);
};

export const seedForms = async (dataSource: DataSource) => {
  const formRepository = dataSource.getRepository(Form);
  const formFieldRepository = dataSource.getRepository(FormField);

  const form = await formRepository.save({
    title: 'بيانات الموظفين - Employees Information',
    description: 'Fill in the employee information form - تعبئة نموذج بيانات الموظف',
    isActive: true,
  });

  const fields = [
    {
      label: 'اسم الموظف  - Employee Name',
      key: 'employeeName',
      type: FieldType.TEXT,
      required: true,
      placeholder: 'أدخل الاسم الكامل - Enter full name',
      order: 1,
      form,
    },
    {
      label: 'رقم الهوية / الإقامة - Saudi ID / Iqama ID',
      key: 'idNumber',
      type: FieldType.TEXT,
      required: true,
      placeholder: 'أدخل رقم الهوية - Enter ID number',
      order: 2,
      form,
    },
    {
      label: 'تاريخ الميلاد /  Date of Birth',
      key: 'birthDate',
      type: FieldType.DATE,
      required: true,
      placeholder: 'اختر التاريخ - Select date',
      order: 3,
      form,
    },
    {
      label: 'مكان الميلاد -  Place of Birth',
      key: 'birthPlace',
      type: FieldType.TEXT,
      required: true,
      placeholder: 'أدخل مكان الميلاد - Enter birth place',
      order: 4,
      form,
    },
    {
      label: 'العمر - Age',
      key: 'age',
      type: FieldType.NUMBER,
      required: true,
      placeholder: 'أدخل العمر - Enter age',
      order: 5,
      form,
    },
    {
      label: 'الجنس - Gender',
      key: 'gender',
      type: FieldType.RADIO,
      required: true,
      options: ['ذكر - Male', 'أنثى - Female'],
      order: 6,
      form,
    },
    {
      label: 'تاريخ اصدار الهوية / الإقامة  - Date of issuance of ID / Iqama',
      key: 'idIssueDate',
      type: FieldType.DATE,
      required: true,
      placeholder: 'اختر تاريخ الإصدار - Select issue date',
      order: 7,
      form,
    },
    {
      label: 'تاريخ انتهاء الهوية / الإقامة  -   Date of Expiry of ID / Iqama',
      key: 'idExpiryDate',
      type: FieldType.DATE,
      required: false,
      placeholder: 'اختر تاريخ الانتهاء - Select expiry date',
      order: 8,
      form,
    },
    {
      label: 'مكان إصدار الهوية / الإقامة  - Place of issuance of ID / Iqama',
      key: 'idIssuePlace',
      type: FieldType.TEXT,
      required: true,
      placeholder: 'أدخل مكان الإصدار - Enter issue place',
      order: 9,
      form,
    },
    {
      label: 'رقم جواز السفر - Passport Number',
      key: 'passportNumber',
      type: FieldType.TEXT,
      required: false,
      placeholder: 'أدخل رقم الجواز - Enter passport number',
      order: 10,
      form,
    },
    {
      label: 'تاريخ اصدار الجواز / Passport Issue Date',
      key: 'passportIssueDate',
      type: FieldType.DATE,
      required: false,
      placeholder: 'اختر تاريخ الإصدار - Select issue date',
      order: 11,
      form,
    },
    {
      label: 'تاريخ انتهاء الجواز / Passport Expiry Date',
      key: 'passportExpiryDate',
      type: FieldType.DATE,
      required: false,
      placeholder: 'اختر تاريخ الانتهاء - Select expiry date',
      order: 12,
      form,
    },
    {
      label: 'رقم الجوال - Mobile number',
      key: 'mobileNumber',
      type: FieldType.TEXT,
      required: true,
      placeholder: 'أدخل رقم الجوال - Enter mobile number',
      order: 13,
      form,
    },
    {
      label: 'البريد الالكتروني - Email',
      key: 'email',
      type: FieldType.EMAIL,
      required: true,
      placeholder: 'أدخل البريد الإلكتروني - Enter email',
      order: 14,
      form,
    },
    {
      label: 'الجنسية - Nationality',
      key: 'nationality',
      type: FieldType.TEXT,
      required: true,
      placeholder: 'أدخل الجنسية - Enter nationality',
      order: 15,
      form,
    },
    {
      label: 'الديانة - Religion',
      key: 'religion',
      type: FieldType.TEXT,
      required: true,
      placeholder: 'أدخل الديانة - Enter religion',
      order: 16,
      form,
    },
    {
      label: 'الحالة الاجتماعية - Marital Status',
      key: 'maritalStatus',
      type: FieldType.TEXT,
      required: true,
      placeholder: 'أدخل الحالة الاجتماعية - Enter marital status',
      order: 17,
      form,
    },
    {
      label: 'المدينة - City',
      key: 'city',
      type: FieldType.TEXT,
      required: true,
      placeholder: 'أدخل المدينة - Enter city',
      order: 18,
      form,
    },
    {
      label: 'العنوان  - Address',
      key: 'address',
      type: FieldType.TEXTAREA,
      required: true,
      placeholder: 'أدخل العنوان الكامل - Enter full address',
      order: 19,
      form,
    },
    {
      label: 'الدرجة العلمية - Degree',
      key: 'degree',
      type: FieldType.TEXT,
      required: true,
      placeholder: 'أدخل الدرجة العلمية - Enter degree',
      order: 20,
      form,
    },
    {
      label: 'التخصص التعليمي - Educational Specialization',
      key: 'specialization',
      type: FieldType.TEXT,
      required: true,
      placeholder: 'أدخل التخصص - Enter specialization',
      order: 21,
      form,
    },
    {
      label: 'اسم البنك للموظف - Bank Name of the Employee',
      key: 'bankName',
      type: FieldType.TEXT,
      required: true,
      placeholder: 'أدخل اسم البنك - Enter bank name',
      order: 22,
      form,
    },
    {
      label: 'الايبان البنكي للموظف  - Employee Bank Iban',
      key: 'bankIban',
      type: FieldType.TEXT,
      required: true,
      placeholder: 'أدخل رقم الآيبان - Enter IBAN number',
      order: 23,
      form,
    },
    {
      label: 'اسم المشروع - Project Name',
      key: 'projectName',
      type: FieldType.TEXT,
      required: true,
      placeholder: 'أدخل اسم المشروع - Enter project name',
      order: 24,
      form,
    },
    {
      label: 'تاريخ الانضمام المتوقع  - Expected Joining Date',
      key: 'joiningDate',
      type: FieldType.DATE,
      required: true,
      placeholder: 'اختر تاريخ الانضمام - Select joining date',
      order: 25,
      form,
    },
    {
      label: 'رفع صورة الهوية - Upload ID Document',
      key: 'idDocument',
      type: FieldType.FILE,
      required: true,
      placeholder: 'ارفع صورة واضحة للهوية - Upload clear ID document',
      order: 26,
      form,
    },
  ];

  await formFieldRepository.save(fields);
  console.log('✅ Seeded 1 form with 25 fields');
};


export const seedFormSubmissions = async (dataSource: DataSource) => {
  const submissionRepository = dataSource.getRepository(FormSubmission);
  const userRepository = dataSource.getRepository(User);
  const formRepository = dataSource.getRepository(Form);

  // Get all users and the first form
  const users = await userRepository.find();
  const form = await formRepository.findOne({ where: { id: 1 } }); // Assuming you have at least one form

  if (!form) {
    console.warn('No forms found - skipping form submissions seeding');
    return;
  }

  const submissions = users.map((user:any) => {
    // Generate realistic submission data for each user
    const answers = {
      employeeName: user?.name || 'Unknown',
      idNumber: `ID${Math.floor(100000 + Math.random() * 900000)}`,
      birthDate: new Date(1980 + Math.floor(Math.random() * 20)),
      birthPlace: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam'][Math.floor(Math.random() * 5)],
      age: 25 + Math.floor(Math.random() * 30),
      gender: Math.random() > 0.5 ? 'ذكر - Male' : 'أنثى - Female',
      idIssueDate: new Date(2015 + Math.floor(Math.random() * 8)),
      idExpiryDate: new Date(2025 + Math.floor(Math.random() * 5)),
      idIssuePlace: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam'][Math.floor(Math.random() * 5)],
      mobileNumber: `05${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: user.email,
      nationality: ['Saudi', 'Egyptian', 'Indian', 'Pakistani', 'Filipino'][Math.floor(Math.random() * 5)],
      religion: ['Islam', 'Christianity'][Math.floor(Math.random() * 2)],
      maritalStatus: ['Single', 'Married'][Math.floor(Math.random() * 2)],
      city: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam'][Math.floor(Math.random() * 5)],
      address: `${Math.floor(100 + Math.random() * 900)} Main St, ${['North', 'South', 'East', 'West'][Math.floor(Math.random() * 4)]} District`,
      degree: ['High School', 'Bachelor', 'Master', 'PhD'][Math.floor(Math.random() * 4)],
      specialization: ['Computer Science', 'Engineering', 'Business', 'Medicine'][Math.floor(Math.random() * 4)],
      bankName: ['Al Rajhi', 'Alinma', 'SABB', 'NCB'][Math.floor(Math.random() * 4)],
      bankIban: `SA${Math.floor(1000000000000000000 + Math.random() * 9000000000000000000)}`,
      projectName: user.project?.name || 'Unknown Project',
      joiningDate: new Date(2020 + Math.floor(Math.random() * 4)),
    };

    return {
      user,
      answers,
      isCheck: Math.random() > 0.3, // 70% chance of being checked
      form_id: form.id.toString(),
    };
  });

  await submissionRepository.save(submissions);
  console.log(`✅ Seeded ${submissions.length} form submissions`);
};

async function runSeeder() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'aws-0-eu-central-1.pooler.supabase.com',
    port: 5432,
    username: 'postgres.sghvszzxubiyocwhfczj',
    password: 'ahmedshtya-083',
    database: 'EDMS',
    entities: [User, FormField, FormSubmission, Form, Asset , Project],
    synchronize: true,
    logging: true,
  });

  try {
    await dataSource.initialize();
    await seedUsers(dataSource);
    await seedForms(dataSource);
    await seedFormSubmissions(dataSource);

    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runSeeder();
