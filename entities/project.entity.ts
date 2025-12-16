import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	OneToMany,
	CreateDateColumn,
	UpdateDateColumn,
	DeleteDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Project {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column({ nullable: true }) // Make it nullable
	adminId: number | null; // Update type

	@OneToMany(() => User, (user) => user.project)
	users: User[];

	@CreateDateColumn()
	created_at: Date;

	@UpdateDateColumn()
	updated_at: Date;

	@DeleteDateColumn() // ✅ حذف ناعم
	deleted_at: Date;
}
