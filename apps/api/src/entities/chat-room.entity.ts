import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { Family } from "./family.entity";
import { User } from "./user.entity";

@Entity("chat_rooms")
@Unique(["familyId", "donorUserId"])
export class ChatRoom {
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

  @Column({ name: "sponsorship_id", type: "uuid", nullable: true })
  sponsorshipId!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
