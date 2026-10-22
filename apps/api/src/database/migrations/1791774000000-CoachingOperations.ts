import { MigrationInterface, QueryRunner } from 'typeorm';
// Generated from coaching entity metadata against the applied repository migrations.
export class CoachingOperations1791774000000 implements MigrationInterface {
  name = 'CoachingOperations1791774000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "coaching_operations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_type" character varying(40) NOT NULL, "generation_status" character varying(20) NOT NULL, "delivery_status" character varying(30) NOT NULL, "error_code" character varying(30), "safety_flags" jsonb NOT NULL DEFAULT \'[]\', "source" character varying(30) NOT NULL DEFAULT \'development_sample\', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0dd6b38b736a8ec1808bb4386f1" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_coaching_operations_created" ON "coaching_operations" ("created_at") ',
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."idx_coaching_operations_created"',
    );
    await queryRunner.query('DROP TABLE "coaching_operations"');
  }
}
