import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { AdminPermissionValue } from '@purposemint/contracts';

@Entity('custom_roles')
@Index('uq_custom_roles_name', ['name'], { unique: true })
export class CustomRole {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', length: 500 })
  description!: string;

  @Column({ type: 'jsonb', default: [] })
  permissions!: AdminPermissionValue[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
