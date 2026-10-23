import { MigrationInterface, QueryRunner } from 'typeorm';

export class KycVerifications1792027000000 implements MigrationInterface {
  name = 'KycVerifications1792027000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "kyc_verifications" (
        "user_id" uuid NOT NULL,
        "status" character varying(30) NOT NULL,
        "provider" character varying(50) NOT NULL DEFAULT 'manual',
        "provider_reference" character varying(255),
        "failure_code" character varying(100),
        "failure_reason" text,
        "attempt_count" integer NOT NULL DEFAULT 0,
        "status_changed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "last_retry_at" TIMESTAMP WITH TIME ZONE,
        "escalated_at" TIMESTAMP WITH TIME ZONE,
        "escalated_by" uuid,
        "escalation_note" text,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_kyc_verifications" PRIMARY KEY ("user_id"),
        CONSTRAINT "CHK_kyc_verifications_status" CHECK ("status" IN
          ('not_started', 'in_progress', 'verified', 'failed', 'requires_action', 'under_review')),
        CONSTRAINT "FK_kyc_verifications_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_kyc_verifications_escalated_by" FOREIGN KEY ("escalated_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "idx_kyc_verifications_status" ON "kyc_verifications" ("status", "status_changed_at")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "kyc_verifications"');
  }
}
