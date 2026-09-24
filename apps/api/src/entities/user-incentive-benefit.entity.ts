/**
 * Stores one customer benefit per program, including the eligibility decision,
 * reviewed amount, and rule snapshot. Restricted relations preserve its history.
 */
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { IncentiveProgram } from './incentive-program.entity';

@Entity('user_incentive_benefits')
@Index('uq_incentive_user_program', ['userId', 'programId'], { unique: true })
@Index('idx_incentive_benefit_reviewed', ['reviewedAt'])
@Check(
  'ck_incentive_benefit_amount',
  '"amount_cents" > 0 AND "amount_cents" <= 100000000',
)
export class UserIncentiveBenefit {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
  @Column({ name: 'program_id', type: 'uuid' }) programId!: string;
  @ManyToOne(() => IncentiveProgram, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'program_id' })
  program!: IncentiveProgram;
  @Column({ type: 'boolean' }) eligible!: boolean;
  @Column({ name: 'eligibility_reason', type: 'text' })
  eligibilityReason!: string;
  @Column({ name: 'rule_snapshot', type: 'text' }) ruleSnapshot!: string;
  @Column({ name: 'program_version', type: 'integer' }) programVersion!: number;
  @Column({ name: 'amount_cents', type: 'integer' }) amountCents!: number;
  @CreateDateColumn({ name: 'reviewed_at', type: 'timestamptz' })
  reviewedAt!: Date;
}
