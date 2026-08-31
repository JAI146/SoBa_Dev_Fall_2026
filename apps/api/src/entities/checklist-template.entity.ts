import { ChecklistCategory, type ChecklistCategoryValue } from '@purposemint/contracts';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Pathway } from './pathway.entity';
@Entity('checklist_templates') @Index('idx_checklist_templates_pathway', ['pathwayKey'])
export class ChecklistTemplate {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'pathway_key', type: 'varchar', length: 100 }) pathwayKey!: string;
  @ManyToOne(() => Pathway, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'pathway_key' }) pathway?: Pathway;
  @Column({ type: 'enum', enum: Object.values(ChecklistCategory) }) category!: ChecklistCategoryValue;
  @Column({ type: 'varchar', length: 180 }) title!: string;
  @Column({ type: 'varchar', length: 500 }) description!: string;
  @Column({ name: 'sort_order', type: 'int' }) sortOrder!: number;
}
