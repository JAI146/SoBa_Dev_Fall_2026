/**
 * Stores each program’s amount, eligibility criteria, approval state, and version.
 * Database checks require a positive amount and approved rules before activation.
 */
import {
  Check,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('incentive_programs')
@Check(
  'ck_incentive_program_amount',
  '"amount_cents" > 0 AND "amount_cents" <= 100000000',
)
@Check(
  'ck_incentive_program_activation',
  'NOT ("active" AND "rules_provisional")',
)
export class IncentiveProgram {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 80, unique: true }) key!: string;
  @Column({ type: 'varchar', length: 100 }) name!: string;
  @Column({ name: 'amount_cents', type: 'integer' }) amountCents!: number;
  @Column({ type: 'varchar', length: 3, default: 'USD' }) currency!: 'USD';
  @Column({ type: 'boolean', default: false }) active!: boolean;
  @Column({ name: 'rules_provisional', type: 'boolean', default: true })
  rulesProvisional!: boolean;
  @Column({
    name: 'eligibility_mode',
    type: 'varchar',
    length: 30,
    default: 'staff_review',
  })
  eligibilityMode!: 'staff_review';
  @Column({ name: 'eligibility_description', type: 'text' })
  eligibilityDescription!: string;
  @Column({ type: 'integer', default: 1 }) version!: number;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
