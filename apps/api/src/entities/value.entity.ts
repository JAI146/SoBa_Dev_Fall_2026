import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GoalTemplate } from './goal-template.entity';
import { UserValue } from './user-value.entity';

@Entity('values')
export class Value {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('uq_values_key', { unique: true })
  @Column({ type: 'varchar', length: 100 })
  key!: string;

  @Column({ type: 'varchar', length: 100 })
  label!: string;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ name: 'icon_name', type: 'varchar', length: 80 })
  iconName!: string;

  @Column({ name: 'color_token', type: 'varchar', length: 40 })
  colorToken!: string;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder!: number;

  @OneToMany(() => GoalTemplate, (template) => template.value)
  goalTemplates?: GoalTemplate[];

  @OneToMany(() => UserValue, (userValue) => userValue.value)
  userValues?: UserValue[];
}
