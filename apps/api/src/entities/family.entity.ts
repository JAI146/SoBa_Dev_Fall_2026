import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";

export enum GovernorateEnum {
  NORTH_GAZA = "north_gaza",
  GAZA = "gaza",
  MIDDLE_AREA = "middle_area",
  KHAN_YOUNIS = "khan_younis",
  RAFHA = "rafah",
  UNKNOWN = "unknown",
}

export enum HousingStatusEnum {
  TENT = "tent",
  SHELTER = "shelter",
  DAMAGED_HOME = "damaged_home",
  HOSTED = "hosted",
  RENTED = "rented",
  UNKNOWN = "unknown",
}

export enum IncomeStatusEnum {
  NONE = "none",
  LIMITED = "limited",
  UNSTABLE = "unstable",
  UNKNOWN = "unknown",
}

export enum DisplacementStatusEnum {
  DISPLACED = "displaced",
  NOT_DISPLACED = "not_displaced",
  RETURNED = "returned",
  UNKNOWN = "unknown",
}

export enum CaseCategoryEnum {
  MARTYR_FAMILY = "martyr_family",
  WIDOW = "widow",
  ORPHANS = "orphans",
  MODEST_FAMILY = "modest_family",
  NO_BREADWINNER = "no_breadwinner",
  DISPLACED = "displaced",
  MEDICAL = "medical",
  DISABILITY = "disability",
  GENERAL = "general",
}

export enum PriorityLevelEnum {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  NORMAL = "normal",
}

export enum FamilyProfileStatusEnum {
  DRAFT = "draft",
  PENDING_REVIEW = "pending_review",
  PUBLISHED = "published",
  HIDDEN = "hidden",
  ARCHIVED = "archived",
  SUSPENDED = "suspended",
  NEEDS_UPDATE = "needs_update",
}

export enum CoverageStatusEnum {
  NOT_COVERED = "not_covered",
  PARTIALLY_COVERED = "partially_covered",
  FULLY_COVERED = "fully_covered",
  EXPIRED = "expired",
}

@Entity("families")
export class Family {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "public_code", type: "varchar", length: 50, unique: true })
  publicCode!: string;

  @Column({ name: "pilot_batch_number", type: "int", default: 1 })
  pilotBatchNumber!: number;

  @Column({ name: "is_pilot_family", type: "boolean", default: true })
  isPilotFamily!: boolean;

  @Column({ name: "pilot_notes", type: "text", nullable: true })
  pilotNotes!: string | null;

  @Column({ name: "head_of_family_name", type: "varchar", length: 255 })
  headOfFamilyName!: string;

  @Column({ name: "head_of_family_name_ar", type: "varchar", length: 255, nullable: true })
  headOfFamilyNameAr!: string | null;

  @Column({ name: "national_id", type: "varchar", length: 100, nullable: true })
  nationalId!: string | null;

  @Column({ name: "internal_phone", type: "varchar", length: 50, nullable: true })
  internalPhone!: string | null;

  @Column({ name: "detailed_address", type: "text", nullable: true })
  detailedAddress!: string | null;

  @Column({ name: "detailed_address_ar", type: "text", nullable: true })
  detailedAddressAr!: string | null;

  @Column({ name: "data_source", type: "varchar", length: 255, nullable: true })
  dataSource!: string | null;

  @Column({ name: "assigned_case_officer", type: "varchar", length: 255, nullable: true })
  assignedCaseOfficer!: string | null;

  @Column({
    type: "enum",
    enum: GovernorateEnum,
    default: GovernorateEnum.UNKNOWN,
  })
  governorate!: GovernorateEnum;

  @Column({ name: "area_general", type: "varchar", length: 255, nullable: true })
  areaGeneral!: string | null;

  @Column({ name: "area_general_ar", type: "varchar", length: 255, nullable: true })
  areaGeneralAr!: string | null;

  @Column({ name: "family_size", type: "int", default: 0 })
  familySize!: number;

  @Column({ name: "children_count", type: "int", default: 0 })
  childrenCount!: number;

  @Column({ name: "women_count", type: "int", default: 0 })
  womenCount!: number;

  @Column({ name: "elderly_count", type: "int", default: 0 })
  elderlyCount!: number;

  @Column({ name: "infant_count", type: "int", default: 0 })
  infantCount!: number;

  @Column({ name: "external_links", type: "text", nullable: true })
  externalLinks!: string | null;

  @Column({ name: "receiving_methods", type: "jsonb", default: () => "'[]'" })
  receivingMethods!: Array<Record<string, string>>;

  @Column({ name: "media_items", type: "jsonb", default: () => "'[]'" })
  mediaItems!: Array<{
    url: string;
    blurredUrl: string | null;
    mimeType: string;
    filename: string;
    kind: "image" | "video";
    isSensitive: boolean;
  }>;

  @Column({ name: "has_widow", type: "boolean", default: false })
  hasWidow!: boolean;

  @Column({ name: "has_orphans", type: "boolean", default: false })
  hasOrphans!: boolean;

  @Column({ name: "has_disabled_member", type: "boolean", default: false })
  hasDisabledMember!: boolean;

  @Column({ name: "has_chronic_patient", type: "boolean", default: false })
  hasChronicPatient!: boolean;

  @Column({
    name: "housing_status",
    type: "enum",
    enum: HousingStatusEnum,
    default: HousingStatusEnum.UNKNOWN,
  })
  housingStatus!: HousingStatusEnum;

  @Column({
    name: "income_status",
    type: "enum",
    enum: IncomeStatusEnum,
    default: IncomeStatusEnum.UNKNOWN,
  })
  incomeStatus!: IncomeStatusEnum;

  @Column({
    name: "displacement_status",
    type: "enum",
    enum: DisplacementStatusEnum,
    default: DisplacementStatusEnum.UNKNOWN,
  })
  displacementStatus!: DisplacementStatusEnum;

  @Column({
    name: "case_category",
    type: "enum",
    enum: CaseCategoryEnum,
    default: CaseCategoryEnum.GENERAL,
  })
  caseCategory!: CaseCategoryEnum;

  @Column({
    name: "priority_level",
    type: "enum",
    enum: PriorityLevelEnum,
    default: PriorityLevelEnum.MEDIUM,
  })
  priorityLevel!: PriorityLevelEnum;

  @Column({
    name: "monthly_required_amount",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
  })
  monthlyRequiredAmount!: string;

  @Column({
    name: "monthly_covered_amount",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
  })
  monthlyCoveredAmount!: string;

  @Column({
    name: "monthly_remaining_amount",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
  })
  monthlyRemainingAmount!: string;

  @Column({ name: "public_story", type: "text", nullable: true })
  publicStory!: string | null;

  @Column({ name: "public_story_ar", type: "text", nullable: true })
  publicStoryAr!: string | null;

  @Column({
    name: "profile_status",
    type: "enum",
    enum: FamilyProfileStatusEnum,
    default: FamilyProfileStatusEnum.PUBLISHED,
  })
  profileStatus!: FamilyProfileStatusEnum;

  @Column({
    name: "coverage_status",
    type: "enum",
    enum: CoverageStatusEnum,
    default: CoverageStatusEnum.NOT_COVERED,
  })
  coverageStatus!: CoverageStatusEnum;

  @Column({ name: "family_login_enabled", type: "boolean", default: true })
  familyLoginEnabled!: boolean;

  @Column({ name: "family_user_id", type: "uuid", nullable: true })
  familyUserId!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "family_user_id" })
  familyUser?: User | null;

  @Column({ name: "internal_notes", type: "text", nullable: true })
  internalNotes!: string | null;

  @Column({ name: "verification_notes", type: "text", nullable: true })
  verificationNotes!: string | null;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
