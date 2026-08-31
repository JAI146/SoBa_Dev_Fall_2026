import { PathwayApplicationStatus, PathwayVerificationMethod, type PathwayApplicationStatusValue, type PathwayVerificationMethodValue } from '@purposemint/contracts';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';
import { Pathway } from './pathway.entity'; import { User } from './user.entity';
import { PathwayApplicationPartner } from './pathway-application-partner.entity'; import { PathwayChecklistItem } from './pathway-checklist-item.entity';
@Entity('pathway_applications')
@Index('idx_pathway_applications_user', ['userId'])
@Index('uq_pathway_applications_draft', ['userId', 'pathwayKey'], { unique: true, where: `"status" = 'draft'` })
export class PathwayApplication {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string; @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'user_id' }) user?: User;
  @Column({ name: 'pathway_key', type: 'varchar', length: 100 }) pathwayKey!: string; @ManyToOne(() => Pathway, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'pathway_key' }) pathway?: Pathway;
  @Column({ name: 'attested_amount', type: 'numeric', precision: 10, scale: 2, nullable: true, transformer: { to: (value: number | null) => value, from: (value: string | number | null) => value === null ? null : numericTransformer.from(value) } }) attestedAmount!: number | null;
  @Column({ name: 'attestation_accepted_at', type: 'timestamptz', nullable: true }) attestationAcceptedAt!: Date | null;
  @Column({ name: 'verification_method', type: 'enum', enum: Object.values(PathwayVerificationMethod), default: PathwayVerificationMethod.SELF_ATTESTED }) verificationMethod!: PathwayVerificationMethodValue;
  @Column({ type: 'enum', enum: Object.values(PathwayApplicationStatus), default: PathwayApplicationStatus.DRAFT }) status!: PathwayApplicationStatusValue;
  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true }) submittedAt!: Date | null;
  @OneToMany(() => PathwayApplicationPartner, (row) => row.application) applicationPartners?: PathwayApplicationPartner[];
  @OneToMany(() => PathwayChecklistItem, (row) => row.application) checklistItems?: PathwayChecklistItem[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date; @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
