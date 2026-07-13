import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("activity_logs")
export class ActivityLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "actor_user_id", type: "uuid" })
  actorUserId!: string;

  @Column({ name: "actor_admin_role", type: "varchar", length: 64, nullable: true })
  actorAdminRole!: string | null;

  @Column({ type: "varchar", length: 100 })
  action!: string;

  @Column({ name: "entity_type", type: "varchar", length: 64 })
  entityType!: string;

  @Column({ name: "entity_id", type: "uuid", nullable: true })
  entityId!: string | null;

  @Column({ type: "varchar", length: 500 })
  summary!: string;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
