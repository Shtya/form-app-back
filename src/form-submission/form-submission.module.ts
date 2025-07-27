import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormSubmission } from 'entities/form-submissions.entity';
import { User } from 'entities/user.entity';
import { FormSubmissionService } from './form-submission.service';
import { FormSubmissionController } from './form-submission.controller';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([FormSubmission, User])],
  providers: [FormSubmissionService , JwtService],
  controllers: [FormSubmissionController],
})
export class FormSubmissionModule {}
