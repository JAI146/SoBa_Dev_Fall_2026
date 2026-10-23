import type { BillingTerms } from '@purposemint/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserSubscription } from './user-subscription.entity';

@Entity('subscription_history')
@Index('idx_subscription_history', ['subscriptionId', 'recordedAt'])
export class SubscriptionHistory {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'subscription_id', type: 'uuid' }) subscriptionId!: string;
  @ManyToOne(() => UserSubscription, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: UserSubscription;
  @Column({ type: 'varchar', length: 40 }) action!: string;
  @Column({
    name: 'previous_plan_key',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  previousPlanKey!: string | null;
  @Column({ name: 'new_plan_key', type: 'varchar', length: 20, nullable: true })
  newPlanKey!: string | null;
  @Column({ name: 'previous_billing', type: 'jsonb', nullable: true })
  previousBilling!: BillingTerms | null;
  @Column({ name: 'new_billing', type: 'jsonb', nullable: true })
  newBilling!: BillingTerms | null;
  @Column({ name: 'effective_at', type: 'timestamptz' }) effectiveAt!: Date;
  @Column({ name: 'authorized_by', type: 'uuid', nullable: true })
  authorizedBy!: string | null;
  @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt!: Date;
}
