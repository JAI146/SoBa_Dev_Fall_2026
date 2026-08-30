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
import { numericTransformer } from '../common/numeric.transformer';
import { GoalTemplate } from './goal-template.entity';
import { SavingsEntry } from './savings-entry.entity';
import { User } from './user.entity';

@Entity('user_goals')
@Index('idx_user_goals_user_id', ['userId'])
@Index('uq_user_goals_one_focus', ['userId'], {
  unique: true,
  where: '"is_focus" = true',
})
export class UserGoal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({
    name: 'target_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  targetAmount!: number;

  /**
   * Cached sum of `savings_entries` for this goal. Recalculated in the same
   * transaction as every savings write so the two cannot drift.
   */
  @Column({
    name: 'saved_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  savedAmount!: number;

  @Column({ name: 'source_template_id', type: 'uuid', nullable: true })
  sourceTemplateId!: string | null;

  @ManyToOne(() => GoalTemplate, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'source_template_id' })
  sourceTemplate?: GoalTemplate | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'is_focus', type: 'boolean', default: false })
  isFocus!: boolean;

  @Column({ name: 'is_pathway_eligible', type: 'boolean', default: false })
  isPathwayEligible!: boolean;

  @Column({ name: 'icon_emoji', type: 'varchar', length: 16, default: '🎯' })
  iconEmoji!: string;

  @OneToMany(() => SavingsEntry, (entry) => entry.goal)
  savingsEntries?: SavingsEntry[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
