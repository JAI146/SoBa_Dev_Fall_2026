import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { NotificationJobPublic } from '@purposemint/contracts';
import { User } from './user.entity';
import { NotificationCategory } from './notification-category.entity';
@Entity('notification_jobs')
@Index('idx_notification_jobs_due', ['status', 'scheduledAt'])
@Index('idx_notification_jobs_user', ['userId', 'createdAt'])
@Check(
  'ck_notification_job_attempts',
  '"attempts" >= 0 AND "retry_requests" >= 0',
)
export class NotificationJob {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
  @Column({ name: 'category_key', type: 'varchar', length: 50 })
  categoryKey!: string;
  @ManyToOne(() => NotificationCategory, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_key' })
  category!: NotificationCategory;
  @Column({ name: 'event_type', type: 'varchar', length: 80 })
  eventType!: string;
  @Column({ type: 'varchar', length: 10 })
  channel!: NotificationJobPublic['channel'];
  @Column({ type: 'varchar', length: 30 })
  status!: NotificationJobPublic['status'];
  @Column({ type: 'boolean' }) mandatory!: boolean;
  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 240,
    unique: true,
  })
  idempotencyKey!: string;
  @Column({ name: 'scheduled_at', type: 'timestamptz' }) scheduledAt!: Date;
  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date | null;
  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;
  @Column({ type: 'integer', default: 0 }) attempts!: number;
  @Column({ name: 'retry_requests', type: 'integer', default: 0 })
  retryRequests!: number;
  @Column({ type: 'varchar', length: 80, nullable: true }) reason!:
    string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
