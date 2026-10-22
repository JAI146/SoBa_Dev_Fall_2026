import { MigrationInterface, QueryRunner } from 'typeorm';

// Generated from the new entity metadata against the repository migration baseline.
export class NotificationOperations1791770000000 implements MigrationInterface {
  name = 'NotificationOperations1791770000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "notification_categories" ("key" character varying(50) NOT NULL, "name" character varying(80) NOT NULL, "mandatory" boolean NOT NULL DEFAULT false, "push_supported" boolean NOT NULL DEFAULT true, "email_supported" boolean NOT NULL DEFAULT true, "enabled" boolean NOT NULL DEFAULT true, "min_interval_hours" integer NOT NULL DEFAULT \'24\', CONSTRAINT "ck_notification_category_interval" CHECK ("min_interval_hours" BETWEEN 1 AND 720), CONSTRAINT "ck_notification_category_mandatory" CHECK (NOT "mandatory" OR ("enabled" AND "push_supported" AND "email_supported")), CONSTRAINT "ck_notification_category_channels" CHECK ("push_supported" OR "email_supported"), CONSTRAINT "PK_c8a4d58ffd2f6831cf039f45d10" PRIMARY KEY ("key"))',
    );
    await queryRunner.query(
      'CREATE TABLE "notification_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "category_key" character varying(50) NOT NULL, "event_type" character varying(80) NOT NULL, "channel" character varying(10) NOT NULL, "status" character varying(30) NOT NULL, "mandatory" boolean NOT NULL, "idempotency_key" character varying(240) NOT NULL, "scheduled_at" TIMESTAMP WITH TIME ZONE NOT NULL, "sent_at" TIMESTAMP WITH TIME ZONE, "delivered_at" TIMESTAMP WITH TIME ZONE, "attempts" integer NOT NULL DEFAULT \'0\', "retry_requests" integer NOT NULL DEFAULT \'0\', "reason" character varying(80), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_8fc21dd1273c8b4ce316a1a236c" UNIQUE ("idempotency_key"), CONSTRAINT "ck_notification_job_attempts" CHECK ("attempts" >= 0 AND "retry_requests" >= 0), CONSTRAINT "PK_a9069c02b999ccf3a03b5e7bda9" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_notification_jobs_user" ON "notification_jobs" ("user_id", "created_at") ',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_notification_jobs_due" ON "notification_jobs" ("status", "scheduled_at") ',
    );
    await queryRunner.query(
      'ALTER TABLE "notification_jobs" ADD CONSTRAINT "FK_35735cbdf24bd062464cdc2ab46" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "notification_jobs" ADD CONSTRAINT "FK_e589959fc42ed2154aeef084e30" FOREIGN KEY ("category_key") REFERENCES "notification_categories"("key") ON DELETE RESTRICT ON UPDATE NO ACTION',
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "notification_jobs" DROP CONSTRAINT "FK_e589959fc42ed2154aeef084e30"',
    );
    await queryRunner.query(
      'ALTER TABLE "notification_jobs" DROP CONSTRAINT "FK_35735cbdf24bd062464cdc2ab46"',
    );
    await queryRunner.query('DROP INDEX "public"."idx_notification_jobs_due"');
    await queryRunner.query('DROP INDEX "public"."idx_notification_jobs_user"');
    await queryRunner.query('DROP TABLE "notification_jobs"');
    await queryRunner.query('DROP TABLE "notification_categories"');
  }
}
