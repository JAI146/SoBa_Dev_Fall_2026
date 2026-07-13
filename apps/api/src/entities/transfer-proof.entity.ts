import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Sponsorship } from "./sponsorship.entity";
import { User } from "./user.entity";

export enum TransferProofStatusEnum {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  CLARIFICATION = "clarification",
  DISPUTED = "disputed",
}

@Entity("transfer_proofs")
export class TransferProof {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "sponsorship_id", type: "uuid" })
  sponsorshipId!: string;

  @ManyToOne(() => Sponsorship)
  @JoinColumn({ name: "sponsorship_id" })
  sponsorship?: Sponsorship;

  @Column({ name: "donor_user_id", type: "uuid" })
  donorUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "donor_user_id" })
  donorUser?: User;

  @Column({ name: "file_url", type: "varchar", length: 500 })
  fileUrl!: string;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({
    type: "varchar",
    length: 32,
    default: TransferProofStatusEnum.PENDING,
  })
  status!: TransferProofStatusEnum;

  @Column({ name: "receiving_method_index", type: "int", default: 0 })
  receivingMethodIndex!: number;

  @Column({
    name: "receiving_method_type",
    type: "varchar",
    length: 64,
    nullable: true,
  })
  receivingMethodType!: string | null;

  @Column({ name: "admin_notes", type: "text", nullable: true })
  adminNotes!: string | null;

  @Column({ name: "reviewed_by", type: "uuid", nullable: true })
  reviewedBy!: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: "reviewed_by" })
  reviewer?: User;

  @Column({ name: "reviewed_at", type: "timestamptz", nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  amount!: string | null;

  @Column({ name: "transfer_date", type: "date", nullable: true })
  transferDate!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
