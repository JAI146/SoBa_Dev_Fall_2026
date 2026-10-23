import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { KycStatusValue } from '@purposemint/contracts';

@Entity('kyc_verifications')
export class KycVerification {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 30 })
  status!: KycStatusValue;

  @Column({ type: 'varchar', length: 50, default: 'manual' })
  provider!: string;

  @Column({
    name: 'provider_reference',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerReference!: string | null;

  @Column({
    name: 'failure_code',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  failureCode!: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount!: number;

  @Column({
    name: 'status_changed_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  statusChangedAt!: Date;

  @Column({ name: 'last_retry_at', type: 'timestamptz', nullable: true })
  lastRetryAt!: Date | null;

  @Column({ name: 'escalated_at', type: 'timestamptz', nullable: true })
  escalatedAt!: Date | null;

  @Column({ name: 'escalated_by', type: 'uuid', nullable: true })
  escalatedBy!: string | null;

  @Column({ name: 'escalation_note', type: 'text', nullable: true })
  escalationNote!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
