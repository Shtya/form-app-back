import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Form } from 'entities/forms.entity';
import { FormField } from 'entities/form-field.entity';
import { FormSubmission } from 'entities/form-submissions.entity';
import { CreateFormDto, UpdateFormDto, SubmitFormDto } from 'dto/form.dto';

@Injectable()
export class FormService {
  constructor(
    @InjectRepository(Form)
    private readonly formRepository: Repository<Form>,
    @InjectRepository(FormField)
    private readonly fieldRepository: Repository<FormField>,
    @InjectRepository(FormSubmission)
    private readonly submissionRepository: Repository<FormSubmission>,
  ) {}

  async updateFieldOrders(fields: { id: number; order: number }[]) {
    for (const field of fields) {
      await this.fieldRepository.update(field.id, { order: field.order });
    }
    return { message: 'Field orders updated successfully' };
  }

  async activateForm(id: number): Promise<Form> {
    const formToActivate = await this.formRepository.findOne({ where: { id } });

    if (!formToActivate) {
      throw new NotFoundException('Form not found');
    }

    // جعل الكل غير مفعل
    await this.formRepository.update({ isActive: true }, { isActive: false });

    // تفعيل النموذج المطلوب
    formToActivate.isActive = true;
    return await this.formRepository.save(formToActivate);
  }

  // ✅ استرجاع النموذج الفعّال
  async getActiveForm(): Promise<Form | null> {
    return await this.formRepository.findOne({
      where: { isActive: true },
      relations: ['fields'], // إذا أردت إحضار الحقول معه
    });
  }

  async createForm(dto: CreateFormDto) {
    const form = this.formRepository.create({
      title: dto.title,
      description: dto.description,
    });
    const savedForm = await this.formRepository.save(form);

    const fields = dto.fields.map(fieldDto =>
      this.fieldRepository.create({
        ...fieldDto,
        form: savedForm,
      }),
    );

    savedForm.fields = await this.fieldRepository.save(fields);
    return savedForm;
  }

  async updateForm(dto: UpdateFormDto) {
    // 1. استرجاع النموذج مع الحقول المرتبطة به
    const form = await this.formRepository.findOne({
      where: { id: dto.id },
      relations: ['fields'],
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    // 2. تحديث بيانات النموذج
    form.title = dto.title;
    form.description = dto.description;

    // 3. التأكد من أن كل حقل مرسل يحتوي على id
    for (const fieldDto of dto.fields) {
      if (!fieldDto.id) {
        throw new BadRequestException('Each field must have an id');
      }
    }

    // 4. تحديث الحقول الموجودة فقط
    const updatedFields = [];

    for (const fieldDto of dto.fields) {
      const existingField = form.fields.find(f => f.id === fieldDto.id);

      if (!existingField) {
        throw new NotFoundException(`Field with id ${fieldDto.id} not found in this form`);
      }

      Object.assign(existingField, fieldDto);
      updatedFields.push(await this.fieldRepository.save(existingField));
    }

    // 5. لا نقوم بحذف أي حقل، فقط تحديث الموجود
    // لذلك لا حاجة لتنفيذ أي حذف

    // 6. حفظ النموذج بالحقول الجديدة (تم تعديلها فقط)
    form.fields = form.fields; // بدون تغيير

    const updatedForm = await this.formRepository.save(form);

    // 7. إرجاع استجابة منسقة
    return {
      id: updatedForm.id,
      title: updatedForm.title,
      description: updatedForm.description,
      created_at: updatedForm.created_at,
      fields: updatedForm.fields.map(field => ({
        id: field.id,
        label: field.label,
        key: field.key,
        type: field.type,
        required: field.required,
        options: field.options,
        order: field.order,
      })),
    };
  }

  async getAllForms(page = 1, limit = 10) {
    const [results, total] = await this.formRepository.findAndCount({
      relations: ['fields'],
      skip: (page - 1) * limit,
      take: limit,
      order: {
        created_at: 'DESC', // ← أو استخدم id: 'DESC' إن لم يكن لديك createdAt
      },
    });

    return {
      data: results,
      total,
      page,
      last_page: Math.ceil(total / limit),
    };
  }

  async getFormById(id: number) {
    const form = await this.formRepository.findOne({
      where: { id },
      relations: ['fields'],
    });
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  async deleteForm(id: number) {
    const result = await this.formRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Form not found');
    }
    return { message: 'Form deleted successfully' };
  }

  // form.service.ts

  async addFieldsToForm(formId: number, dto: any) {
    const form = await this.formRepository.findOne({ where: { id: formId } });
    if (!form) throw new NotFoundException('Form not found');

    const fields = dto.fields.map(field => {
      return this.fieldRepository.create({
        label: field.label,
        key: field.key,
        type: field.type,
        placeholder: field.placeholder,
        required: field.required,
        options: field.options,
        order: field.order,
        form,
      });
    });

    return this.fieldRepository.save(fields); // حفظهم دفعة واحدة
  }

  async deleteFieldFromForm(formId: number, fieldId: number) {
    const form = await this.formRepository.findOne({
      where: { id: formId },
      relations: ['fields'],
    });

    if (!form) throw new NotFoundException('Form not found');

    const field = form.fields.find(f => f.id === fieldId);
    if (!field) throw new NotFoundException('Field not found in this form');

    await this.fieldRepository.delete(fieldId);

    return { message: `Field ${fieldId} deleted from form ${formId}` };
  }
}
