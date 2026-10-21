import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminRolePermissions1788212000000 implements MigrationInterface {
  name = 'AdminRolePermissions1788212000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "admin_role_permissions" (
        "role_key" character varying(100) NOT NULL,
        "permissions" jsonb NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_role_permissions" PRIMARY KEY ("role_key")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "admin_role_permissions"`);
  }
}
