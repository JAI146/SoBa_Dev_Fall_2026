import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveNotificationRolePermissions1792025000000 implements MigrationInterface {
  name = 'RemoveNotificationRolePermissions1792025000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "admin_role_permissions"
      SET "permissions" = "permissions" - 'notifications.view' - 'notifications.edit'
      WHERE "permissions" ?| ARRAY['notifications.view', 'notifications.edit']
    `);
    await queryRunner.query(`
      UPDATE "custom_roles"
      SET "permissions" = "permissions" - 'notifications.view' - 'notifications.edit'
      WHERE "permissions" ?| ARRAY['notifications.view', 'notifications.edit']
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Removed permissions are obsolete and must not be restored on rollback.
  }
}
