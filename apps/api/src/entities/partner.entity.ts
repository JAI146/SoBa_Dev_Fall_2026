import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Pathway } from './pathway.entity';
@Entity('partners') @Index('idx_partners_pathway_active', ['pathwayKey', 'isActive'])
export class Partner {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 180 }) name!: string;
  @Column({ name: 'partner_type', type: 'varchar', length: 100 }) partnerType!: string;
  @Column({ type: 'varchar', length: 500 }) description!: string;
  @Column({ name: 'location_label', type: 'varchar', length: 150 }) locationLabel!: string;
  @Column({ name: 'capability_tags', type: 'text', array: true, default: '{}' }) capabilityTags!: string[];
  @Column({ name: 'pathway_key', type: 'varchar', length: 100 }) pathwayKey!: string;
  @ManyToOne(() => Pathway, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'pathway_key' }) pathway?: Pathway;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @Column({ name: 'sort_order', type: 'int' }) sortOrder!: number;
}
