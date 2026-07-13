import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { SponsorTicket } from "./sponsor-ticket.entity";
import { User } from "./user.entity";

export enum SponsorTicketSenderRoleEnum {
  DONOR = "donor",
  ADMIN = "admin",
}

@Entity("sponsor_ticket_messages")
export class SponsorTicketMessage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "ticket_id", type: "uuid" })
  ticketId!: string;

  @ManyToOne(() => SponsorTicket, (ticket) => ticket.messages)
  @JoinColumn({ name: "ticket_id" })
  ticket?: SponsorTicket;

  @Column({ name: "sender_user_id", type: "uuid" })
  senderUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "sender_user_id" })
  senderUser?: User;

  @Column({
    name: "sender_role",
    type: "enum",
    enum: SponsorTicketSenderRoleEnum,
  })
  senderRole!: SponsorTicketSenderRoleEnum;

  @Column({ type: "text" })
  content!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
