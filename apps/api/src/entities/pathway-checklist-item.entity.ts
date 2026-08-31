import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ChecklistTemplate } from './checklist-template.entity'; import { PathwayApplication } from './pathway-application.entity';
@Entity('pathway_checklist_items') @Index('uq_pathway_checklist_template', ['applicationId', 'checklistTemplateId'], { unique: true })
export class PathwayChecklistItem {
 @PrimaryGeneratedColumn('uuid') id!: string;
 @Column({ name: 'application_id', type: 'uuid' }) applicationId!: string; @ManyToOne(() => PathwayApplication, (app) => app.checklistItems, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'application_id' }) application?: PathwayApplication;
 @Column({ name: 'checklist_template_id', type: 'uuid' }) checklistTemplateId!: string; @ManyToOne(() => ChecklistTemplate, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'checklist_template_id' }) checklistTemplate?: ChecklistTemplate;
 @Column({ name: 'is_complete', type: 'boolean', default: false }) isComplete!: boolean; @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!: Date | null;
 @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date; @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
