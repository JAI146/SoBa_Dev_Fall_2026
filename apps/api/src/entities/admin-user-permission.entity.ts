import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { AdminPermissionValue } from '@purposemint/contracts';

@Entity('admin_user_permissions')
export class AdminUserPermission {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'jsonb' })
  permissions!: AdminPermissionValue[];

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
