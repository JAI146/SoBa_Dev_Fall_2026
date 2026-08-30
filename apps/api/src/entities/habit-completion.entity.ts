import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { UserHabit } from './user-habit.entity';

@Entity('habit_completions')
@Index('idx_habit_completions_user_id', ['userId'])
@Index('uq_habit_completions_habit_day', ['userHabitId', 'completedOn'], {
  unique: true,
})
export class HabitCompletion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'user_habit_id', type: 'uuid' })
  userHabitId!: string;

  @ManyToOne(() => UserHabit, (habit) => habit.completions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_habit_id' })
  userHabit?: UserHabit;

  @Column({ name: 'completed_on', type: 'date' })
  completedOn!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
