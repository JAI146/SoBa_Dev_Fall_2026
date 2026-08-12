import { OtpType, type OtpTypeValue } from '@purposemint/contracts';
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
 * One-time codes for email verification and password reset. Codes are bcrypt
 * hashed, single-use, and attempt-capped. Issuing a new code invalidates every
 * outstanding code of the same type.
 */
@Entity('user_otps')
@Index('idx_user_otps_user_type_consumed', ['userId', 'type', 'consumedAt'])
export class UserOtp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'enum', enum: Object.values(OtpType) })
  type!: OtpTypeValue;

  @Column({ name: 'code_hash', type: 'varchar', length: 255, select: false })
  codeHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
