import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Single-row table (id is always 1). */
@Entity('kyc_settings')
export class KycSettings {
  @PrimaryColumn({ type: 'smallint', default: 1 })
  id!: number;

  @Column({ name: 'max_attempts', type: 'int', default: 3 })
  maxAttempts!: number;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
