import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { AdminPermissionValue } from '@purposemint/contracts';

@Entity('admin_role_permissions')
export class AdminRolePermission {
  @PrimaryColumn({ name: 'role_key', type: 'varchar', length: 100 })
  roleKey!: string;

  @Column({ type: 'jsonb' })
  permissions!: AdminPermissionValue[];

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
