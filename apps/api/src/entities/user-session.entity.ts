import { ClientType, type ClientTypeValue } from '@purposemint/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * A refresh-token row *is* a session. Rotation inserts a new row in the same
 * `familyId` and stamps `rotatedAt` on the old one, so a replayed token is
 * detectable rather than merely expired.
 */
@Entity('user_sessions')
@Index('idx_user_sessions_user_id', ['userId'])
@Index('idx_user_sessions_family_id', ['familyId'])
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  /** All rotations of one login share a family. Reuse revokes the whole family. */
  @Column({ name: 'family_id', type: 'uuid' })
  familyId!: string;

  /** SHA-256 hex of the opaque refresh token. The plaintext is never stored. */
  @Index('uq_user_sessions_token_hash', { unique: true })
  @Column({ name: 'token_hash', type: 'varchar', length: 64, select: false })
  tokenHash!: string;

  @Column({
    name: 'client_type',
    type: 'enum',
    enum: Object.values(ClientType),
  })
  clientType!: ClientTypeValue;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'rotated_at', type: 'timestamptz', nullable: true })
  rotatedAt!: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({
    name: 'revoked_reason',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  revokedReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
