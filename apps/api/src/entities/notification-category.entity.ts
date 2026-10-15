import { Column, Entity, PrimaryColumn, Check } from 'typeorm';
@Entity('notification_categories')
@Check(
  'ck_notification_category_channels',
  '"push_supported" OR "email_supported"',
)
@Check(
  'ck_notification_category_mandatory',
  'NOT "mandatory" OR ("enabled" AND "push_supported" AND "email_supported")',
)
@Check(
  'ck_notification_category_interval',
  '"min_interval_hours" BETWEEN 1 AND 720',
)
export class NotificationCategory {
  @PrimaryColumn({ type: 'varchar', length: 50 }) key!: string;
  @Column({ type: 'varchar', length: 80 }) name!: string;
  @Column({ type: 'boolean', default: false }) mandatory!: boolean;
  @Column({ name: 'push_supported', type: 'boolean', default: true })
  pushSupported!: boolean;
  @Column({ name: 'email_supported', type: 'boolean', default: true })
  emailSupported!: boolean;
  @Column({ type: 'boolean', default: true }) enabled!: boolean;
  @Column({ name: 'min_interval_hours', type: 'integer', default: 24 })
  minIntervalHours!: number;
}
