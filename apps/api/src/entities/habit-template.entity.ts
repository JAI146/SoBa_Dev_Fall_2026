import {
  HabitCategory,
  HabitFrequency,
  type HabitCategoryValue,
  type HabitFrequencyValue,
} from '@purposemint/contracts';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('habit_templates')
export class HabitTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({
    type: 'enum',
    enum: Object.values(HabitFrequency),
  })
  frequency!: HabitFrequencyValue;

  @Column({
    type: 'enum',
    enum: Object.values(HabitCategory),
  })
  category!: HabitCategoryValue;

  @Column({ name: 'icon_emoji', type: 'varchar', length: 16 })
  iconEmoji!: string;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder!: number;
}
