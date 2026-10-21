import type {
  AdminPlanInput,
  PlanEntitlements,
  PlanLimits,
} from '@purposemint/contracts';
import { Check, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';

@Entity('subscription_plans')
@Check(
  'ck_subscription_plan_prices',
  '"price_monthly" >= 0 AND ("price_yearly" IS NULL OR "price_yearly" >= 0)',
)
@Check(
  'ck_subscription_default_plan',
  'NOT "is_default" OR ("active" AND "available" AND "price_monthly" = 0 AND "billing_cycles" @> ARRAY[\'monthly\']::text[] AND "available_from" IS NULL AND "available_until" IS NULL AND "promotion" IS NULL)',
)
@Index('uq_default_subscription_plan', ['isDefault'], {
  unique: true,
  where: '"is_default" = true',
})
export class SubscriptionPlan {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  key!: string;

  @Column({ type: 'varchar', length: 100 }) name!: string;
  @Column({ type: 'varchar', length: 200 }) tagline!: string;
  @Column({
    name: 'price_monthly',
    type: 'numeric',
    precision: 8,
    scale: 2,
    transformer: numericTransformer,
  })
  priceMonthly!: number;
  @Column({ type: 'varchar', length: 100, nullable: true }) badge!:
    string | null;
  @Column({ type: 'varchar', length: 500 }) description!: string;
  @Column({ type: 'text', array: true }) features!: string[];
  @Column({ name: 'cta_label', type: 'varchar', length: 100 })
  ctaLabel!: string;
  @Column({ name: 'sort_order', type: 'int' }) sortOrder!: number;

  // Configured offers; subscriptions store their own agreed billing terms.
  @Column({
    name: 'price_yearly',
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | number | null) =>
        value === null ? null : numericTransformer.from(value),
    },
  })
  priceYearly!: number | null;
  @Column({
    name: 'billing_cycles',
    type: 'text',
    array: true,
    default: () => "ARRAY['monthly']::text[]",
  })
  billingCycles!: AdminPlanInput['billingCycles'];
  @Column({
    type: 'jsonb',
    default: { pathways: false, communityChallenges: false },
  })
  entitlements!: PlanEntitlements;
  @Column({
    type: 'jsonb',
    default: { pathwayApplications: null, challengeParticipations: null },
  })
  limits!: PlanLimits;
  @Column({ type: 'boolean', default: true }) active!: boolean;
  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;
  @Column({ type: 'boolean', default: true }) available!: boolean;
  @Column({ name: 'available_from', type: 'timestamptz', nullable: true })
  availableFrom!: Date | null;
  @Column({ name: 'available_until', type: 'timestamptz', nullable: true })
  availableUntil!: Date | null;
  @Column({ type: 'jsonb', nullable: true })
  promotion!: AdminPlanInput['promotion'];
  @Column({ type: 'int', default: 1 }) version!: number;
}
