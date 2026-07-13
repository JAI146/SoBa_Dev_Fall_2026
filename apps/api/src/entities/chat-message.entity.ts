import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ChatRoom } from "./chat-room.entity";
import { User } from "./user.entity";

export enum ChatMessageTypeEnum {
  TEXT = "text",
  MEDIA = "media",
}

export enum ChatMessageStatusEnum {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  EDITED = "edited",
  ESCALATED = "escalated",
}

export enum ChatSenderRoleEnum {
  DONOR = "donor",
  FAMILY = "family",
}

@Entity("chat_messages")
export class ChatMessage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "room_id", type: "uuid" })
  roomId!: string;

  @ManyToOne(() => ChatRoom)
  @JoinColumn({ name: "room_id" })
  room?: ChatRoom;

  @Column({ name: "sender_user_id", type: "uuid" })
  senderUserId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "sender_user_id" })
  senderUser?: User;

  @Column({
    name: "sender_role",
    type: "enum",
    enum: ChatSenderRoleEnum,
  })
  senderRole!: ChatSenderRoleEnum;

  @Column({
    type: "enum",
    enum: ChatMessageTypeEnum,
  })
  type!: ChatMessageTypeEnum;

  @Column({ type: "text", nullable: true })
  content!: string | null;

  @Column({ name: "media_url", type: "varchar", length: 500, nullable: true })
  mediaUrl!: string | null;

  @Column({
    name: "media_kind",
    type: "varchar",
    length: 16,
    nullable: true,
  })
  mediaKind!: "image" | "video" | "document" | "sticker" | null;

  @Column({
    type: "enum",
    enum: ChatMessageStatusEnum,
    default: ChatMessageStatusEnum.PENDING,
  })
  status!: ChatMessageStatusEnum;

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
