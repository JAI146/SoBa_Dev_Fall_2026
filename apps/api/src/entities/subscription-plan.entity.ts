import { Tier, type TierValue } from '@purposemint/contracts';
import { Column, Entity, PrimaryColumn } from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryColumn({ type: 'enum', enum: Object.values(Tier) })
  key!: TierValue;

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
  @Column({ type: 'varchar', length: 100, nullable: true }) badge!: string | null;
  @Column({ type: 'varchar', length: 500 }) description!: string;
  @Column({ type: 'text', array: true }) features!: string[];
  @Column({ name: 'cta_label', type: 'varchar', length: 100 }) ctaLabel!: string;
  @Column({ name: 'sort_order', type: 'int' }) sortOrder!: number;
}
