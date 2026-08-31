import { Tier, type TierValue } from '@purposemint/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';
import { User } from './user.entity';

@Entity('upgrade_intents')
@Index(['userId', 'planKey'], { unique: true })
export class UpgradeIntent {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
  @Column({ name: 'plan_key', type: 'enum', enum: Object.values(Tier) })
  planKey!: TierValue;
  @ManyToOne(() => SubscriptionPlan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_key' })
  plan?: SubscriptionPlan;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
