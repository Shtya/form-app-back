 import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
	DeleteDateColumn,
} from 'typeorm';
import { User } from './user.entity';


@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column()
  url: string;

  @Column({nullable : true , default : "other"})
  type: string;

  @Column()
  category: string;

  @Column({ nullable: true })
  mimeType: string;

  @Column({ nullable: true })
  size: number; 

  @ManyToOne(() => User, user => user.uploads, { eager: false, onDelete: 'SET NULL' })
  user: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

	@DeleteDateColumn()
  deleted_at: Date;
}
