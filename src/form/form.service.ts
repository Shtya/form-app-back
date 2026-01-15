import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Form } from 'entities/forms.entity';
import { FormField } from 'entities/form-field.entity';
import { FormSubmission } from 'entities/form-submissions.entity';
import { CreateFormDto, UpdateFormDto, SubmitFormDto } from 'dto/form.dto';
import { UserRole } from '../../entities/user.entity';

@Injectable()
export class FormService {
	constructor(
		@InjectRepository(Form)
		private readonly formRepository: Repository<Form>,
		@InjectRepository(FormField)
		private readonly fieldRepository: Repository<FormField>,
		@InjectRepository(FormSubmission)
		private readonly submissionRepository: Repository<FormSubmission>,
	) { }

	async updateFieldOrders(fields: { id: number; order: number }[]) {
		for (const field of fields) {
			await this.fieldRepository.update(field.id, { order: field.order });
		}
		return { message: 'Field orders updated successfully' };
	}

	async updateFormTitle(formId: number, title: string, user: any) {
		if (!title || !String(title).trim()) {
			throw new BadRequestException('Title is required');
		}

		const form = await this.formRepository.findOne({ where: { id: formId } });

		if (!form) {
			throw new NotFoundException('Form not found');
		}
 
		if (user.role === UserRole.SUPERVISOR) {
			if (form.adminId !== user.id) {
				throw new ForbiddenException('You are not allowed to edit this form');
			}
		} else if (user.role === UserRole.ADMIN) { 
			if (form.adminId !== null) {
				throw new ForbiddenException('Admins can only edit admin forms');
			}
		}

		form.title = title.trim();
		return await this.formRepository.save(form);
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

	async createForm(dto: CreateFormDto, user: any) {
		// Determine adminId based on user role
		let adminId: number | null = null;

		if (user.role === UserRole.SUPERVISOR) {
			adminId = user.id;
		} else if (user.role === UserRole.ADMIN) {
			adminId = null;
			adminId = null;
		} else {
			throw new ForbiddenException('Only admins and supervisors can create forms');
		}

		// Create the form
		const form = this.formRepository.create({
			title: dto.title,
			description: dto.description,
			adminId: adminId,
			type: dto.type || 'project',
			approvalFlow: dto.approvalFlow,
		});

		const savedForm = await this.formRepository.save(form);

		// Create and save fields
		if (dto.fields && dto.fields.length > 0) {
			const fields = dto.fields.map(fieldDto =>
				this.fieldRepository.create({
					...fieldDto,
					form: savedForm,
				}),
			);
			savedForm.fields = await this.fieldRepository.save(fields);
		}

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
		if (dto.type) form.type = dto.type;
        if (dto.approvalFlow) form.approvalFlow = dto.approvalFlow;

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

	async getAllForms(page = 1, limit = 10, type?: string) {
		// Convert to numbers to avoid TypeORM error
		const pageNum = Number(page) || 1;
		const limitNum = Number(limit) || 10;

		const whereCondition: any = { adminId: IsNull() };
		if (type) {
			whereCondition.type = type;
		} else {
            // If no type specified, default to 'project' or show all? 
            // Existing behavior was showing all admin forms. 
            // Better to show only 'project' if type is not passed? 
            // Or maybe existing forms don't have type set yet (null)?
            // The column has default 'project', so new ones will have it. Old ones might need migration if DB is not dropped.
            // But Assuming existing behavior should be preserved.
            // If I filter by type: 'project', I might miss old ones if default wasn't applied to existing rows (sqlite/postgres differ).
            // Let's assume we want to support filtering.
        }

		const [results, total] = await this.formRepository.findAndCount({
			where: whereCondition, // Only forms where adminId IS NULL
			relations: ['fields'],
			skip: (pageNum - 1) * limitNum,
			take: limitNum,
			order: {
				created_at: 'DESC',
			},
		});

		return {
			data: results,
			total,
			page: pageNum,
			last_page: Math.ceil(total / limitNum),
		};
	}

	async getAllFormsSuperVisor(page = 1, limit = 10, adminId?: number) {
		// Convert page and limit to numbers
		const pageNum = Number(page);
		const limitNum = Number(limit);

		// Validate numbers
		if (isNaN(pageNum) || pageNum < 1) {
			throw new BadRequestException('Page must be a positive number');
		}

		if (isNaN(limitNum) || limitNum < 1) {
			throw new BadRequestException('Limit must be a positive number');
		}

		const queryBuilder = this.formRepository
			.createQueryBuilder('form')
			.leftJoinAndSelect('form.fields', 'fields')
			.orderBy('form.created_at', 'DESC')
			.skip((pageNum - 1) * limitNum)  // Use converted numbers
			.take(limitNum);                 // Use converted numbers

		if (adminId) {
			queryBuilder.where('form.adminId = :adminId', { adminId });
		}

		const [results, total] = await queryBuilder.getManyAndCount();

		return {
			data: results,
			total,
			page: pageNum,
			last_page: Math.ceil(total / limitNum),
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

		const fields = dto.fields.map((field, index) =>
			this.fieldRepository.create({
				label: field.label,
				key: field.key,
				type: field.type,
				placeholder: field.placeholder,
				required: field.required,
				options: field.options,
				order: field.order ?? index,
				length: field.length ? Number(field.length) : null,
				form,
			}),
		);


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
