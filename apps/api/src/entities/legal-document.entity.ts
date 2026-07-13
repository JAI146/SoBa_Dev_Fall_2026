import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("legal_documents")
export class LegalDocument {
  @PrimaryColumn({ type: "varchar", length: 64 })
  slug!: string;

  @Column({ name: "content_en", type: "text", default: "" })
  contentEn!: string;

  @Column({ name: "content_ar", type: "text", default: "" })
  contentAr!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
