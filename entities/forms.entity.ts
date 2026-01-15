import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	OneToMany,
	CreateDateColumn,
} from 'typeorm';
import { FormField } from './form-field.entity';
import { FormSubmission } from './form-submissions.entity';

export enum ApprovalFlow {
	NONE = '',
	HR_ONLY = 'hr_only',
	SUPERVISOR_ONLY = 'supervisor_only',
	HR_THEN_SUPERVISOR = 'hr_then_supervisor',
	SUPERVISOR_THEN_HR = 'supervisor_then_hr',
}

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

	@Column({ default: 'project' })
	type: string;

	@OneToMany(() => FormField, (field) => field.form, { cascade: true })
	fields: FormField[];

	@Column({nullable : true})
	adminId: number;

	@Column({ nullable: true })
	approvalFlow: string;

	@CreateDateColumn()
	created_at: Date;
}
