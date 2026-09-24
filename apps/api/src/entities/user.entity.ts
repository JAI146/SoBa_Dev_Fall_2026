import {
  AdminRole,
  OnboardingStatus,
  Tier,
  UserStatus,
  UserType,
  type AdminRoleValue,
  type NotificationPreferences,
  type OnboardingStatusValue,
  type PolicyAgreements,
  type TierValue,
  type UserStatusValue,
  type UserTypeValue,
} from '@purposemint/contracts';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
@Index('idx_users_status', ['status'])
@Index('idx_users_deleted_at', ['deletedAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Always stored lowercased and trimmed. Normalise on write and on lookup. */
  @Index('uq_users_email', { unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  /** Never selected by default. Login must `addSelect` it explicitly. */
  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName!: string;

  /** Greeting name from onboarding. Null until the welcome step is saved. */
  @Column({ name: 'display_name', type: 'varchar', length: 100, nullable: true })
  displayName!: string | null;

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

  /** IANA zone captured from the device during onboarding. */
  @Column({ name: 'time_zone', type: 'varchar', length: 100, nullable: true })
  timeZone!: string | null;

  @Column({
    name: 'user_type',
    type: 'enum',
    enum: Object.values(UserType),
    default: UserType.CUSTOMER,
  })
  userType!: UserTypeValue;

  @Column({
    name: 'admin_role',
    type: 'enum',
    enum: Object.values(AdminRole),
    nullable: true,
  })
  adminRole!: AdminRoleValue | null;

  @Column({ name: 'custom_role_id', type: 'uuid', nullable: true })
  customRoleId!: string | null;

  @Column({
    type: 'enum',
    enum: Object.values(UserStatus),
    default: UserStatus.PENDING_EMAIL,
  })
  status!: UserStatusValue;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({
    name: 'onboarding_status',
    type: 'enum',
    enum: Object.values(OnboardingStatus),
    default: OnboardingStatus.NOT_STARTED,
  })
  onboardingStatus!: OnboardingStatusValue;

  /**
   * Set once when `onboardingStatus` becomes `completed`. Null at every other
   * status. Routing uses `onboardingStatus`; this is the completion timestamp.
   */
  @Column({
    name: 'onboarding_completed_at',
    type: 'timestamptz',
    nullable: true,
  })
  onboardingCompletedAt!: Date | null;

  /**
   * True when the user chose "Build Habits First" and has no focus goal.
   * Cleared if they later pick a savings goal during onboarding.
   */
  @Column({
    name: 'onboarding_goal_skipped',
    type: 'boolean',
    default: false,
  })
  onboardingGoalSkipped!: boolean;

  /**
   * Written **only** by the subscription module (Phase 3), and never read to
   * make an authorization decision. Entitlement is decided by the subscription
   * module against Stripe state, not by this column.
   */
  @Column({
    type: 'enum',
    enum: Object.values(Tier),
    default: Tier.FREE,
  })
  tier!: TierValue;

  @Column({ name: 'notification_preferences', type: 'jsonb', default: {} })
  notificationPreferences!: NotificationPreferences;

  @Column({ name: 'policy_agreements', type: 'jsonb', default: {} })
  policyAgreements!: PolicyAgreements;

  @Column({
    name: 'delete_account_requested_at',
    type: 'timestamptz',
    nullable: true,
  })
  deleteAccountRequestedAt!: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
