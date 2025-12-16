import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormSubmission } from 'entities/form-submissions.entity';
import { User } from 'entities/user.entity';
import { FormSubmissionService } from './form-submission.service';
import { FormSubmissionController } from './form-submission.controller';
import { JwtService } from '@nestjs/jwt';
import { Form } from '../../entities/forms.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FormSubmission, User,Form]),HttpModule],
  providers: [FormSubmissionService , JwtService],
  controllers: [FormSubmissionController],
})
export class FormSubmissionModule {}
