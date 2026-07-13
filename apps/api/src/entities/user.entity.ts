import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AdminRoleEnum {
  SUPER_ADMIN = 'super_admin',
}

export enum UserTypeEnum {
  USER = 'visitor',
  ADMIN = 'admin',
}

export enum UserStatusEnum {
  ACTIVE = 'active',
  PENDING_EMAIL = 'pending_email',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName!: string;

  @Column({
    name: 'profile_image_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  profileImageUrl!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ name: 'notification_preferences', type: 'jsonb', default: {} })
  notificationPreferences!: Record<string, boolean>;

  @Column({
    name: 'delete_account_requested_at',
    type: 'timestamptz',
    nullable: true,
  })
  deleteAccountRequestedAt!: Date | null;

  @Column({ name: 'policy_agreements', type: 'jsonb', default: {} })
  policyAgreements!: Record<string, string>;

  @Column({
    name: 'email_otp_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  emailOtpHash!: string | null;

  @Column({ name: 'email_otp_expires_at', type: 'timestamptz', nullable: true })
  emailOtpExpiresAt!: Date | null;

  @Column({
    name: 'password_reset_otp_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  passwordResetOtpHash!: string | null;

  @Column({
    name: 'password_reset_otp_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  passwordResetOtpExpiresAt!: Date | null;

  @Column({
    name: 'user_type',
    type: 'enum',
    enum: UserTypeEnum,
    default: UserTypeEnum.USER,
  })
  userType!: UserTypeEnum;

  @Column({
    name: 'admin_role',
    type: 'enum',
    enum: AdminRoleEnum,
    nullable: true,
  })
  adminRole!: AdminRoleEnum | null;

  @Column({
    type: 'enum',
    enum: UserStatusEnum,
    default: UserStatusEnum.ACTIVE,
  })
  status!: UserStatusEnum;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
