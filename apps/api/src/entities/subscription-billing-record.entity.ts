import type { AdminSubscription, BillingTerms } from '@purposemint/contracts';
import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserSubscription } from './user-subscription.entity';

@Entity('subscription_billing_records')
@Check(
  'ck_subscription_billing_record',
  '"amount_cents" > 0 AND "status" IN (\'paid\', \'failed\')',
)
@Index('uq_subscription_payment_reference', ['reference'], { unique: true })
@Index('idx_subscription_billing', ['subscriptionId', 'recordedAt'])
export class SubscriptionBillingRecord {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'subscription_id', type: 'uuid' }) subscriptionId!: string;
  @ManyToOne(() => UserSubscription, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: UserSubscription;
  @Column({ type: 'varchar', length: 20 })
  status!: AdminSubscription['paymentStatus'];
  @Column({ name: 'amount_cents', type: 'int' }) amountCents!: number;
  @Column({ type: 'jsonb' }) billing!: BillingTerms;
  @Column({ name: 'period_ends_at', type: 'timestamptz' }) periodEndsAt!: Date;
  @Column({ name: 'occurred_at', type: 'timestamptz' }) occurredAt!: Date;
  @Column({ type: 'varchar', length: 160 }) reference!: string;
  @Column({ type: 'varchar', length: 500 }) note!: string;
  @Column({ name: 'authorized_by', type: 'uuid' }) authorizedBy!: string;
  @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt!: Date;
}
