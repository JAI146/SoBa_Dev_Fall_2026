import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Configurable case categories. Rows are deactivated, never deleted, so old cases keep their label. */
@Entity('support_case_categories')
@Index('uq_support_case_categories_key', ['key'], { unique: true })
export class SupportCaseCategory {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 60 }) key!: string;
  @Column({ type: 'varchar', length: 80 }) label!: string;
  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;
  @Column({ type: 'boolean', default: true }) active!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
