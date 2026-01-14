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

@Entity()
@Index(['userId', 'form_id'], { unique: true })
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

  @Column({default : 0 , nullable : true})
  form_id : string ;

	@Column({ type: 'varchar', length: 36, nullable: true })
  employeeId: string;
  
	@CreateDateColumn()
  created_at: Date;
	
	@Column('jsonb')
	answers: Record<string, any>;


}
