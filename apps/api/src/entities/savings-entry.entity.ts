import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';
import { User } from './user.entity';
import { UserGoal } from './user-goal.entity';

@Entity('savings_entries')
@Index('idx_savings_entries_user_id', ['userId'])
@Index('idx_savings_entries_goal_id', ['userGoalId'])
export class SavingsEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'user_goal_id', type: 'uuid' })
  userGoalId!: string;

  @ManyToOne(() => UserGoal, (goal) => goal.savingsEntries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_goal_id' })
  goal?: UserGoal;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  amount!: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
