import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';
import { Partner } from './partner.entity';
import { ChecklistTemplate } from './checklist-template.entity';

export type AmountBreakdown = { label: string; amount: number };
@Entity('pathways')
export class Pathway {
  @PrimaryColumn({ type: 'varchar', length: 100 }) key!: string;
  @Column({ type: 'varchar', length: 150 }) title!: string;
  @Column({ type: 'varchar', length: 500 }) description!: string;
  @Column({ name: 'minimum_amount', type: 'numeric', precision: 10, scale: 2, transformer: numericTransformer }) minimumAmount!: number;
  @Column({ name: 'icon_emoji', type: 'varchar', length: 16 }) iconEmoji!: string;
  @Column({ name: 'why_this_amount_body', type: 'text' }) whyThisAmountBody!: string;
  @Column({ name: 'why_this_amount_breakdown', type: 'jsonb' }) whyThisAmountBreakdown!: AmountBreakdown[];
  @Column({ name: 'source_label', type: 'varchar', length: 150 }) sourceLabel!: string;
  @Column({ name: 'source_url', type: 'varchar', length: 500 }) sourceUrl!: string;
  @Column({ name: 'sort_order', type: 'int' }) sortOrder!: number;
  @OneToMany(() => Partner, (partner) => partner.pathway) partners?: Partner[];
  @OneToMany(() => ChecklistTemplate, (template) => template.pathway) checklistTemplates?: ChecklistTemplate[];
}
