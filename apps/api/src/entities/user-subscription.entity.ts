import type {
  BillingTerms,
  PendingSubscriptionChange,
  AdminSubscription,
} from '@purposemint/contracts';
import {
  Column,
  Check,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';
import { User } from './user.entity';

@Entity('user_subscriptions')
@Check(
  'ck_subscription_status',
  "\"status\" IN ('active', 'past_due', 'cancelled')",
)
@Check(
  'ck_subscription_payment_status',
  "\"payment_status\" IN ('not_required', 'pending', 'paid', 'failed')",
)
@Check('ck_subscription_counts', '"failed_payments" >= 0 AND "version" > 0')
@Index('uq_subscription_user', ['userId'], { unique: true })
@Index('idx_subscription_renewal', ['renewalAt'])
export class UserSubscription {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
  @Column({ name: 'plan_key', type: 'varchar', length: 20 }) planKey!: string;
  @ManyToOne(() => SubscriptionPlan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_key' })
  plan?: SubscriptionPlan;
  @Column({ type: 'varchar', length: 20 }) status!: AdminSubscription['status'];
  @Column({ type: 'jsonb' }) billing!: BillingTerms;
  @Column({ name: 'payment_status', type: 'varchar', length: 20 })
  paymentStatus!: AdminSubscription['paymentStatus'];
  @Column({ name: 'started_at', type: 'timestamptz' }) startedAt!: Date;
  @Column({ name: 'renewal_at', type: 'timestamptz' }) renewalAt!: Date;
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;
  @Column({ name: 'pending_change', type: 'jsonb', nullable: true })
  pendingChange!: PendingSubscriptionChange | null;
  @Column({ name: 'failed_payments', type: 'int', default: 0 })
  failedPayments!: number;
  @Column({ type: 'int', default: 1 }) version!: number;
}
