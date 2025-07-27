import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormService } from './form.service';
import { FormController } from './form.controller';
import { Form } from 'entities/forms.entity';
import { FormField } from 'entities/form-field.entity';
import { FormSubmission } from 'entities/form-submissions.entity';
import { JwtService } from '@nestjs/jwt';
import { User } from 'entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User , Form, FormField, FormSubmission]),
  ],
  providers: [FormService , JwtService],
  controllers: [FormController ],
  exports: [FormService],
  
})
export class FormModule {}


