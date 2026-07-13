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

export enum ProfileUpdateRequestStatusEnum {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

@Entity("family_profile_update_requests")
export class FamilyProfileUpdateRequest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "family_id", type: "uuid" })
  familyId!: string;

  @ManyToOne(() => Family)
  @JoinColumn({ name: "family_id" })
  family?: Family;

  @Column({ name: "field_key", type: "varchar", length: 100 })
  fieldKey!: string;

  @Column({ name: "current_value", type: "text" })
  currentValue!: string;

  @Column({ name: "requested_value", type: "text" })
  requestedValue!: string;

  @Column({
    type: "enum",
    enum: ProfileUpdateRequestStatusEnum,
    default: ProfileUpdateRequestStatusEnum.PENDING,
  })
  status!: ProfileUpdateRequestStatusEnum;

  @Column({ name: "admin_notes", type: "text", nullable: true })
  adminNotes!: string | null;

  @Column({ name: "reviewed_by", type: "uuid", nullable: true })
  reviewedBy!: string | null;

  @Column({ name: "reviewed_at", type: "timestamptz", nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
