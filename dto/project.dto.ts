import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}


 
export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;
}
