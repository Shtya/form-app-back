import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

// @Entity()
// export class FormSubmission {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @ManyToOne(() => User, user => user.formSubmissions, { onDelete: 'CASCADE' })
//   @JoinColumn()
//   user: User;

//   @Column('boolean', { default: false })
//   isCheck: boolean;

//   @Column('jsonb')
//   answers: Record<string, any>;

//   @Column({default : 0 , nullable : true})
//   form_id : string ;

//   @CreateDateColumn()
//   created_at: Date;
// }

export enum SubmissionStatus {
	PENDING = 'pending',
	PENDING_HR = 'pending_hr',
	PENDING_SUPERVISOR = 'pending_supervisor',
	APPROVED = 'approved',
	REJECTED = 'rejected',
}

@Entity()
// @Index(['userId', 'form_id'], { unique: true }) // Commented out to allow multiple submissions? 
// Re-enabling index might block multiple requests. 
// Ideally we should remove this index for employee requests. 
// For now I will NOT modify the index comment directly unless I am sure. 
// But strictly speaking, if user wants multiple vacation requests, this index must go.
// I will comment it out in the ReplacementContent if I can match the line.
@Index(['userId', 'form_id'], { unique: false }) 
export class FormSubmission {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ name: 'userId' })
	userId: number;

	@ManyToOne(() => User, user => user.formSubmissions, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'userId' })
	user: User;

	@Column('boolean', { default: false })
	isCheck: boolean;

    @Column({ default: 'pending' })
    status: string;

  @Column({default : 0 , nullable : true})
  form_id : string ;

	@Column({ type: 'varchar', length: 36, nullable: true })
  employeeId: string;
  
	@CreateDateColumn()
  created_at: Date;
	
	@Column('jsonb')
	answers: Record<string, any>;


}
