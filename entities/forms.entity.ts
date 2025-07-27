import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { FormField } from './form-field.entity';
import { FormSubmission } from './form-submissions.entity';

@Entity()
export class Form {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ default: false }) // 👈 isActive column
  isActive: boolean;
  
  @Column({ nullable: true })
  description: string;

  @OneToMany(() => FormField, (field) => field.form, { cascade: true })
  fields: FormField[];

  @CreateDateColumn()
  created_at: Date;
}
