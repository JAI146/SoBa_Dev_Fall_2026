import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HabitCompletion } from './habit-completion.entity';
import { HabitTemplate } from './habit-template.entity';
import { User } from './user.entity';

@Entity('user_habits')
@Index('idx_user_habits_user_id', ['userId'])
@Index('uq_user_habits_user_template', ['userId', 'sourceTemplateId'], {
  unique: true,
})
export class UserHabit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'source_template_id', type: 'uuid' })
  sourceTemplateId!: string;

  @ManyToOne(() => HabitTemplate, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'source_template_id' })
  sourceTemplate?: HabitTemplate;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => HabitCompletion, (completion) => completion.userHabit)
  completions?: HabitCompletion[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
