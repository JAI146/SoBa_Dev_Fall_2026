import { CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Partner } from './partner.entity'; import { PathwayApplication } from './pathway-application.entity';
@Entity('pathway_application_partners') @Index('uq_pathway_application_partner', ['applicationId', 'partnerId'], { unique: true })
export class PathwayApplicationPartner {
 @PrimaryGeneratedColumn('uuid') id!: string;
 @Column({ name: 'application_id', type: 'uuid' }) applicationId!: string; @ManyToOne(() => PathwayApplication, (app) => app.applicationPartners, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'application_id' }) application?: PathwayApplication;
 @Column({ name: 'partner_id', type: 'uuid' }) partnerId!: string; @ManyToOne(() => Partner, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'partner_id' }) partner?: Partner;
 @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
