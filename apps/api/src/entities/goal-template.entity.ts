import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';
import { Value } from './value.entity';

@Entity('goal_templates')
export class GoalTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({ name: 'value_key', type: 'varchar', length: 100 })
  valueKey!: string;

  @ManyToOne(() => Value, (value) => value.goalTemplates, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'value_key', referencedColumnName: 'key' })
  value?: Value;

  @Column({
    name: 'target_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  targetAmount!: number;

  @Index('idx_goal_templates_pathway')
  @Column({ name: 'is_pathway_eligible', type: 'boolean', default: false })
  isPathwayEligible!: boolean;

  @Column({ name: 'icon_emoji', type: 'varchar', length: 16 })
  iconEmoji!: string;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder!: number;
}
