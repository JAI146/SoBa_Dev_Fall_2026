import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Family } from "./family.entity";
import { Sponsorship } from "./sponsorship.entity";
import { User } from "./user.entity";
import { SponsorTicketMessage } from "./sponsor-ticket-message.entity";

export enum SponsorTicketStatusEnum {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  RESOLVED = "resolved",
}

@Entity("sponsor_tickets")
export class SponsorTicket {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "sponsorship_id", type: "uuid" })
  sponsorshipId!: string;

  @ManyToOne(() => Sponsorship)
  @JoinColumn({ name: "sponsorship_id" })
  sponsorship?: Sponsorship;

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

  @Column({ type: "varchar", length: 200 })
  subject!: string;

  @Column({
    type: "enum",
    enum: SponsorTicketStatusEnum,
    default: SponsorTicketStatusEnum.OPEN,
  })
  status!: SponsorTicketStatusEnum;

  @Column({ name: "resolved_at", type: "timestamptz", nullable: true })
  resolvedAt!: Date | null;

  @OneToMany(() => SponsorTicketMessage, (message) => message.ticket)
  messages?: SponsorTicketMessage[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
