import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminUserPermissions1792026000000 implements MigrationInterface {
  name = 'AdminUserPermissions1792026000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "admin_user_permissions" (
        "user_id" uuid NOT NULL,
        "permissions" jsonb NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_user_permissions" PRIMARY KEY ("user_id"),
        CONSTRAINT "FK_admin_user_permissions_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "admin_user_permissions"');
  }
}
