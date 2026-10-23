import type { BadgeRule } from '@purposemint/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity('badge_definitions')
export class BadgeDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 100 })
  category!: string;

  @Column({ name: 'icon_emoji', type: 'varchar', length: 64 })
  iconEmoji!: string;

  /** All conditions must hold. Percentages use 0-100, not fractions. */
  @Column({ type: 'jsonb' })
  criteria!: BadgeRule[];

  @Column({ type: 'boolean', default: false })
  active!: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reward!: string | null;

  @VersionColumn()
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
