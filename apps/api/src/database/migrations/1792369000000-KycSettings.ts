import { MigrationInterface, QueryRunner } from 'typeorm';

export class KycSettings1792369000000 implements MigrationInterface {
  name = 'KycSettings1792369000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "kyc_settings" (
        "id" smallint NOT NULL DEFAULT 1,
        "max_attempts" integer NOT NULL DEFAULT 3,
        "updated_by" uuid,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_kyc_settings" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_kyc_settings_single_row" CHECK ("id" = 1),
        CONSTRAINT "CHK_kyc_settings_max_attempts" CHECK ("max_attempts" BETWEEN 1 AND 10),
        CONSTRAINT "FK_kyc_settings_updated_by" FOREIGN KEY ("updated_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query('INSERT INTO "kyc_settings" ("id") VALUES (1)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "kyc_settings"');
  }
}
