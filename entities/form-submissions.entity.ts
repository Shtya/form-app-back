import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class FormSubmission {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.formSubmissions, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column('boolean', { default: false })
  isCheck: boolean;

  @Column('jsonb')
  answers: Record<string, any>;

  @Column({default : 0 , nullable : true})
  form_id : string ;

  @CreateDateColumn()
  created_at: Date;
}
