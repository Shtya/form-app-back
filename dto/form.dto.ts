import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FieldType } from '../entities/form-field.entity';

export class FormFieldDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsEnum(FieldType)
  type: FieldType;

  @IsBoolean()
  @IsOptional()
  required?: boolean = false;

  @IsOptional()
  @IsNumber()
  length?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[] = [];

  @IsNumber()
  order: number;
}

export class CreateFormDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields: FormFieldDto[];
}

export class UpdateFormDto extends CreateFormDto {
  @IsNumber()
  id: number;
}

export class SubmitFormDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormSubmissionAnswerDto)
  answers: FormSubmissionAnswerDto[];
}

export class FormSubmissionAnswerDto {
  @IsNumber()
  fieldId: number;

  @IsNotEmpty()
  value: any;
}