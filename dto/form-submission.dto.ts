import { IsNotEmpty, IsObject } from 'class-validator';

export class CreateFormSubmissionDto {
  @IsObject()
  @IsNotEmpty()
  answers: Record<string, any>;


  @IsNotEmpty()
  form_id: string;
}
