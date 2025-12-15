import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { FormSubmission } from './form-submissions.entity';
import { Asset } from './assets.entity';
import { Project } from './project.entity';

export enum UserRole {
	ADMIN = 'admin',
	SUPERVISOR = 'supervisor',
	USER = 'user',
}

@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ unique: true })
	email: string;

	@Column()
	password: string;

	@Column({ nullable: true })
	encryptedPassword?: string; // Add this field

	@Column({
		type: 'enum',
		enum: UserRole,
		default: UserRole.USER,
	})
	role: UserRole;

	@Column({ nullable: true })
	form_id: number

	@Column({ nullable: true })
	created_by: number | null;

	@OneToMany(() => FormSubmission, submission => submission.user)
	formSubmissions: FormSubmission[];

	@OneToMany(() => Asset, upload => upload.user)
	uploads: Asset[];

	@ManyToOne(() => Project, project => project.users, { eager: true }) // optional: eager to always load the project
	@JoinColumn({ name: 'project_id' })
	project: Project;

	@CreateDateColumn()
	created_at: Date;

	@UpdateDateColumn()
	updated_at: Date;
}
