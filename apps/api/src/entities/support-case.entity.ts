import {
  SupportCasePriority,
  SupportCaseStatus,
  SupportCaseType,
  type SupportCasePriorityValue,
  type SupportCaseStatusValue,
  type SupportCaseTypeValue,
} from '@purposemint/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SupportCaseCategory } from './support-case-category.entity';
import { User } from './user.entity';

/**
 * One row per support request. A complaint is `type = 'complaint'` on the same
 * row. This table holds current state only: every change is also written to
 * `audit_events` (entity_type 'support_case'), which is the case history.
 */
@Entity('support_cases')
@Index('uq_support_cases_number', ['caseNumber'], { unique: true })
@Index('idx_support_cases_user', ['userId'])
@Index('idx_support_cases_status', ['status', 'createdAt'])
@Index('idx_support_cases_assignee', ['assigneeId'])
export class SupportCase {
  @PrimaryGeneratedColumn('uuid') id!: string;

  /** Human-readable number shown to staff and used in email subjects. */
  @Column({ name: 'case_number', type: 'integer', generated: 'increment' })
  caseNumber!: number;

  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({
    type: 'varchar',
    length: 20,
    default: SupportCaseType.SUPPORT,
  })
  type!: SupportCaseTypeValue;

  @Column({ name: 'category_id', type: 'uuid' }) categoryId!: string;
  @ManyToOne(() => SupportCaseCategory, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category?: SupportCaseCategory;

  @Column({ type: 'varchar', length: 200 }) subject!: string;
  @Column({ type: 'text' }) description!: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: SupportCasePriority.NORMAL,
  })
  priority!: SupportCasePriorityValue;

  @Column({
    type: 'varchar',
    length: 30,
    default: SupportCaseStatus.NEW,
  })
  status!: SupportCaseStatusValue;

  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId!: string | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee?: User | null;

  @Column({ name: 'escalation_reason', type: 'text', nullable: true })
  escalationReason!: string | null;
  @Column({ name: 'escalated_at', type: 'timestamptz', nullable: true })
  escalatedAt!: Date | null;
  @Column({ type: 'text', nullable: true }) resolution!: string | null;
  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;
  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  /** Snapshot of the creating admin; no FK so the case survives staff changes. */
  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
