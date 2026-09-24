import { MigrationInterface, QueryRunner } from "typeorm";

export class CustomRoles1788211000000 implements MigrationInterface {
  name = "CustomRoles1788211000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "custom_roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "description" character varying(500) NOT NULL,
        "permissions" jsonb NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_custom_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_custom_roles_name" UNIQUE ("name")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "custom_role_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_custom_role" FOREIGN KEY ("custom_role_id") REFERENCES "custom_roles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_custom_role"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "custom_role_id"`);
    await queryRunner.query(`DROP TABLE "custom_roles"`);
  }
}
