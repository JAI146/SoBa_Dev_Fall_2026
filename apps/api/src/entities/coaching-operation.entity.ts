import {
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { CoachingOperationPublic } from '@purposemint/contracts';
/** Operational metadata only. No prompts, replies, conversations or customer identifiers. */
@Entity('coaching_operations')
@Index('idx_coaching_operations_created', ['createdAt'])
export class CoachingOperation {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'event_type', type: 'varchar', length: 40 })
  eventType!: CoachingOperationPublic['eventType'];
  @Column({ name: 'generation_status', type: 'varchar', length: 20 })
  generationStatus!: CoachingOperationPublic['generationStatus'];
  @Column({ name: 'delivery_status', type: 'varchar', length: 30 })
  deliveryStatus!: CoachingOperationPublic['deliveryStatus'];
  @Column({ name: 'error_code', type: 'varchar', length: 30, nullable: true })
  errorCode!: CoachingOperationPublic['errorCode'];
  @Column({ name: 'safety_flags', type: 'jsonb', default: [] })
  safetyFlags!: CoachingOperationPublic['safetyFlags'];
  @Column({ type: 'varchar', length: 30, default: 'development_sample' })
  source!: CoachingOperationPublic['source'];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
