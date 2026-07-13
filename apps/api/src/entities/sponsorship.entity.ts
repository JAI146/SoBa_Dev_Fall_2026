import {

  Column,

  CreateDateColumn,

  Entity,

  JoinColumn,

  ManyToOne,

  PrimaryGeneratedColumn,

  UpdateDateColumn,

} from "typeorm";

import { Family } from "./family.entity";

import { User } from "./user.entity";



export enum SponsorshipTypeEnum {

  FULL = "full",

  PARTIAL = "partial",

}



export enum SponsorshipStatusEnum {

  REQUESTED = "requested",

  ACTIVE = "active",

  PAUSED = "paused",

  COMPLETED = "completed",

  CANCELLED = "cancelled",

  STOPPED = "stopped",

  DISPUTED = "disputed",

}



@Entity("sponsorships")

export class Sponsorship {

  @PrimaryGeneratedColumn("uuid")

  id!: string;



  @Column({ name: "family_id", type: "uuid" })

  familyId!: string;



  @ManyToOne(() => Family)

  @JoinColumn({ name: "family_id" })

  family?: Family;



  @Column({ name: "donor_user_id", type: "uuid" })

  donorUserId!: string;



  @ManyToOne(() => User)

  @JoinColumn({ name: "donor_user_id" })

  donorUser?: User;



  @Column({

    type: "enum",

    enum: SponsorshipTypeEnum,

  })

  type!: SponsorshipTypeEnum;



  @Column({

    name: "monthly_amount",

    type: "decimal",

    precision: 12,

    scale: 2,

  })

  monthlyAmount!: string;



  @Column({ name: "duration_months", type: "int", nullable: true })

  durationMonths!: number | null;



  @Column({ name: "is_ongoing", type: "boolean", default: false })

  isOngoing!: boolean;



  @Column({ type: "text", nullable: true })

  notes!: string | null;



  @Column({ name: "selected_receiving_method_index", type: "int", default: 0 })

  selectedReceivingMethodIndex!: number;



  @Column({ name: "selected_receiving_methods", type: "jsonb", default: [] })

  selectedReceivingMethods!: Array<Record<string, string>>;



  @Column({ name: "initial_message", type: "text", nullable: true })

  initialMessage!: string | null;



  @Column({ name: "initial_message_delivered", type: "boolean", default: false })

  initialMessageDelivered!: boolean;



  @Column({ name: "pledge_accepted_at", type: "timestamptz", nullable: true })

  pledgeAcceptedAt!: Date | null;



  @Column({ name: "receipt_url", type: "varchar", length: 500, nullable: true })

  receiptUrl!: string | null;



  @Column({

    type: "enum",

    enum: SponsorshipStatusEnum,

    default: SponsorshipStatusEnum.REQUESTED,

  })

  status!: SponsorshipStatusEnum;



  @Column({ name: "needs_clarification", type: "boolean", default: false })

  needsClarification!: boolean;



  @Column({ name: "admin_notes", type: "text", nullable: true })

  adminNotes!: string | null;



  @Column({ name: "reviewed_by", type: "uuid", nullable: true })

  reviewedBy!: string | null;



  @Column({ name: "reviewed_at", type: "timestamptz", nullable: true })

  reviewedAt!: Date | null;



  @Column({ name: "activated_at", type: "timestamptz", nullable: true })

  activatedAt!: Date | null;



  @Column({ name: "completed_at", type: "timestamptz", nullable: true })

  completedAt!: Date | null;



  @Column({ name: "stopped_at", type: "timestamptz", nullable: true })

  stoppedAt!: Date | null;



  @Column({ name: "stopped_by", type: "uuid", nullable: true })

  stoppedBy!: string | null;



  @Column({ name: "stop_notes", type: "text", nullable: true })

  stopNotes!: string | null;



  @CreateDateColumn({ name: "created_at" })

  createdAt!: Date;



  @UpdateDateColumn({ name: "updated_at" })

  updatedAt!: Date;

}
