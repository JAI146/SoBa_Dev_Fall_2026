import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandAdminRoles1788210000000 implements MigrationInterface {
  name = 'ExpandAdminRoles1788210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_admin_role_enum" ADD VALUE IF NOT EXISTS 'manager'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."users_admin_role_enum" ADD VALUE IF NOT EXISTS 'auditor'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."users_admin_role_enum" ADD VALUE IF NOT EXISTS 'editor'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."users_admin_role_enum" ADD VALUE IF NOT EXISTS 'support'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing enum values without rebuilding the type.
  }
}
