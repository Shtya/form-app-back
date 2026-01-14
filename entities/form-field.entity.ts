import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Form } from './forms.entity';
import { Exclude } from 'class-transformer';

export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  PHONE = 'phone',
  DATE = 'date',
  SELECT = 'select',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  TEXTAREA = 'textarea',
  EMAIL = 'email',
  FILE = 'file',
  CHECKLIST = 'checklist', // ✅ تمت الإضافة هنا
}

@Entity()
export class FormField {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  label: string;

  @Column()
  key: string; // will be used as the question key

  @Column({ nullable: true })
  placeholder: string;

  @Column({ type: 'enum', enum: FieldType })
  type: FieldType;

  @Column({ default: false })
  required: boolean;
 

  @Column({ type: 'jsonb', nullable: true })
  options: string[]; // used if type is select, radio, checkbox

	@Column({ nullable: true })
  length: number;

  @Column()
  order: number;

  @Exclude() // This will prevent the circular reference
  @ManyToOne(() => Form, form => form.fields, { onDelete: 'CASCADE' })
  @JoinColumn()
  form: Form;
}
