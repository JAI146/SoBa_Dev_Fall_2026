import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserProgressLevels1789000000000 implements MigrationInterface {
  name = 'UserProgressLevels1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "current_level" smallint`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "current_level_source" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "current_level_assigned_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "CHK_users_current_level" CHECK (
      ("current_level" IS NULL AND "current_level_source" IS NULL AND "current_level_assigned_at" IS NULL)
      OR ("current_level" BETWEEN 1 AND 5 AND "current_level_source" IN ('mock', 'calculated', 'manual') AND "current_level_assigned_at" IS NOT NULL)
    )`);
    await queryRunner.query(
      `CREATE INDEX "idx_users_current_level" ON "users" ("current_level") WHERE "current_level" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_users_current_level"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "CHK_users_current_level"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "current_level_assigned_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "current_level_source"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "current_level"`);
  }
}
