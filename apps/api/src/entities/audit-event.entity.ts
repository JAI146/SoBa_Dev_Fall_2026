import {
  AuditActorType,
  AuditOutcome,
  type AuditActorTypeValue,
  type AuditOutcomeValue,
} from '@purposemint/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Append-only security trail.
 *
 * `actorUserId` deliberately carries no foreign key: an audit row has to
 * outlive the user it describes, including a hard delete.
 *
 * `metadata` must never contain secrets, tokens, OTP codes or password
 * material. `AuditService` is the only writer and strips unknown keys.
 */
@Entity('audit_events')
@Index('idx_audit_events_created_at', ['createdAt'])
@Index('idx_audit_events_actor_user_id', ['actorUserId'])
@Index('idx_audit_events_action', ['action'])
export class AuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Null when the actor is the system rather than a person. */
  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId!: string | null;

  @Column({
    name: 'actor_type',
    type: 'enum',
    enum: Object.values(AuditActorType),
  })
  actorType!: AuditActorTypeValue;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 100, nullable: true })
  entityType!: string | null;

  @Column({ name: 'entity_id', type: 'varchar', length: 100, nullable: true })
  entityId!: string | null;

  @Column({ type: 'enum', enum: Object.values(AuditOutcome) })
  outcome!: AuditOutcomeValue;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
