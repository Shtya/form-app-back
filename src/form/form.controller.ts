import { Body, Controller, Get, Post, Put, Delete, Param, UseGuards, Patch } from '@nestjs/common';
import { FormService } from './form.service';
import { CreateFormDto, UpdateFormDto, SubmitFormDto } from 'dto/form.dto';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from 'entities/user.entity';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('forms')
@UseGuards(AuthGuard, RolesGuard)
export class FormController {
  constructor(private readonly formService: FormService) {}

   @Patch('re-order')
  async updateFieldOrders(@Body() dto: any) {
    return this.formService.updateFieldOrders(dto.fields);
  }

  @Post(':id/activate')
  async activateForm(@Param('id') id: number) {
    return this.formService.activateForm(+id);
  }

  // ✅ Endpoint لاسترجاع النموذج المفعل
  @Get('active')
  async getActiveForm() {
    return this.formService.getActiveForm();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async createForm(@Body() dto: CreateFormDto) {
    return this.formService.createForm(dto);
  }

  @Patch()
  @Roles(UserRole.ADMIN)
  async updateForm(@Body() dto: UpdateFormDto) {
    return this.formService.updateForm(dto);
  }

  @Get()
  async getAllForms() {
    return this.formService.getAllForms();
  }

  @Get(':id')
  async getFormById(@Param('id') id: string) {
    return this.formService.getFormById(+id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async deleteForm(@Param('id') id: string) {
    return this.formService.deleteForm(+id);
  }

  @Post(':id/fields')
  @Roles(UserRole.ADMIN)
  async addFieldToForm(@Param('id') formId: string, @Body() dto: any) {
    return this.formService.addFieldsToForm(+formId, dto);
  }

  @Delete(':formId/fields/:fieldId')
  @Roles(UserRole.ADMIN)
  async deleteFieldFromForm(@Param('formId') formId: string, @Param('fieldId') fieldId: string) {
    return this.formService.deleteFieldFromForm(+formId, +fieldId);
  }
}
