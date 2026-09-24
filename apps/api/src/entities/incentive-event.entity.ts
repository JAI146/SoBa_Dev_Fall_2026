/**
 * Maps recorded benefit events and signed balance changes to PostgreSQL.
 * Unique indexes protect awards, request keys, evidence references, and reversals;
 * goal snapshots retain historical context when goals change.
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
import { UserIncentiveBenefit } from './user-incentive-benefit.entity';
import type { IncentiveEventInput } from '@purposemint/contracts';

/** Append-only journal. Goal/actor identifiers are snapshots and survive deletion. */
@Entity('incentive_events')
@Index('idx_incentive_event_benefit', ['benefitId', 'recordedAt'])
@Index('uq_incentive_event_idempotency', ['idempotencyKey'], { unique: true })
@Index('uq_incentive_event_reference', ['source', 'reference'], {
  unique: true,
})
@Index('uq_incentive_event_reversal', ['reversesEventId'], {
  unique: true,
  where: '"reverses_event_id" IS NOT NULL',
})
@Index('uq_incentive_event_award', ['benefitId'], {
  unique: true,
  where: '"kind" = \'award\'',
})
@Check(
  'ck_incentive_event_amount',
  '"amount_cents" >= 0 AND "amount_cents" <= 100000000',
)
export class IncentiveEvent {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'benefit_id', type: 'uuid' }) benefitId!: string;
  @ManyToOne(() => UserIncentiveBenefit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'benefit_id' })
  benefit!: UserIncentiveBenefit;
  @Column({ type: 'varchar', length: 30 }) kind!:
    IncentiveEventInput['kind'] | 'eligibility';
  @Column({ name: 'amount_cents', type: 'integer' }) amountCents!: number;
  @Column({ name: 'earned_delta', type: 'integer', default: 0 })
  earnedDelta!: number;
  @Column({ name: 'distributed_delta', type: 'integer', default: 0 })
  distributedDelta!: number;
  @Column({ name: 'allocated_delta', type: 'integer', default: 0 })
  allocatedDelta!: number;
  @Column({ name: 'withdrawn_delta', type: 'integer', default: 0 })
  withdrawnDelta!: number;
  @Column({ name: 'goal_id', type: 'uuid', nullable: true }) goalId!:
    string | null;
  @Column({ name: 'goal_title', type: 'varchar', length: 150, nullable: true })
  goalTitle!: string | null;
  @Column({ type: 'varchar', length: 30, nullable: true }) category!:
    IncentiveEventInput['category'] | null;
  @Column({ name: 'reverses_event_id', type: 'uuid', nullable: true })
  reversesEventId!: string | null;
  @Column({ type: 'text' }) reason!: string;
  @Column({ type: 'varchar', length: 160 }) reference!: string;
  @Column({ type: 'varchar', length: 30, default: 'staff_recorded' })
  source!: 'staff_recorded';
  @Column({ name: 'idempotency_key', type: 'uuid' }) idempotencyKey!: string;
  @Column({ name: 'request_fingerprint', type: 'varchar', length: 64 })
  requestFingerprint!: string;
  @Column({ name: 'actor_user_id', type: 'uuid' }) actorUserId!: string;
  @Column({ name: 'occurred_at', type: 'timestamptz' }) occurredAt!: Date;
  @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt!: Date;
}
