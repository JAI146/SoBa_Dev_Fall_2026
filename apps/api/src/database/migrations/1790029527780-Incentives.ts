/**
 * Adds program settings, one benefit per customer/program, and the event journal.
 * Constraints prevent duplicate awards, retries, and reversals; restrictive foreign
 * keys preserve history. Rollback removes only these new tables and their indexes.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class Incentives1790029527780 implements MigrationInterface {
  name = 'Incentives1790029527780';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "incentive_programs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying(80) NOT NULL, "name" character varying(100) NOT NULL, "amount_cents" integer NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'USD', "active" boolean NOT NULL DEFAULT false, "rules_provisional" boolean NOT NULL DEFAULT true, "eligibility_mode" character varying(30) NOT NULL DEFAULT 'staff_review', "eligibility_description" text NOT NULL, "version" integer NOT NULL DEFAULT '1', "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_26f34921d1dd5aa1b7b415d1020" UNIQUE ("key"), CONSTRAINT "ck_incentive_program_activation" CHECK (NOT ("active" AND "rules_provisional")), CONSTRAINT "ck_incentive_program_amount" CHECK ("amount_cents" > 0 AND "amount_cents" <= 100000000), CONSTRAINT "PK_7e497284b3881dbd1dc25598f39" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_incentive_benefits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "program_id" uuid NOT NULL, "eligible" boolean NOT NULL, "eligibility_reason" text NOT NULL, "rule_snapshot" text NOT NULL, "program_version" integer NOT NULL, "amount_cents" integer NOT NULL, "reviewed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "ck_incentive_benefit_amount" CHECK ("amount_cents" > 0 AND "amount_cents" <= 100000000), CONSTRAINT "PK_7c0985950abad06fb4f2191e4e3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_incentive_benefit_reviewed" ON "user_incentive_benefits" ("reviewed_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_incentive_user_program" ON "user_incentive_benefits" ("user_id", "program_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "incentive_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "benefit_id" uuid NOT NULL, "kind" character varying(30) NOT NULL, "amount_cents" integer NOT NULL, "earned_delta" integer NOT NULL DEFAULT '0', "distributed_delta" integer NOT NULL DEFAULT '0', "allocated_delta" integer NOT NULL DEFAULT '0', "withdrawn_delta" integer NOT NULL DEFAULT '0', "goal_id" uuid, "goal_title" character varying(150), "category" character varying(30), "reverses_event_id" uuid, "reason" text NOT NULL, "reference" character varying(160) NOT NULL, "source" character varying(30) NOT NULL DEFAULT 'staff_recorded', "idempotency_key" uuid NOT NULL, "request_fingerprint" character varying(64) NOT NULL, "actor_user_id" uuid NOT NULL, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL, "recorded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "ck_incentive_event_amount" CHECK ("amount_cents" >= 0 AND "amount_cents" <= 100000000), CONSTRAINT "PK_534ae2a50176caf7f1253086bd9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_incentive_event_award" ON "incentive_events" ("benefit_id") WHERE "kind" = 'award'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_incentive_event_reversal" ON "incentive_events" ("reverses_event_id") WHERE "reverses_event_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_incentive_event_reference" ON "incentive_events" ("source", "reference") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_incentive_event_idempotency" ON "incentive_events" ("idempotency_key") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_incentive_event_benefit" ON "incentive_events" ("benefit_id", "recorded_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_incentive_benefits" ADD CONSTRAINT "FK_5de4d7ca1020bb0d999b5ca2ed3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_incentive_benefits" ADD CONSTRAINT "FK_1b4b1a0fdacdfd9bfaaa89f1e6c" FOREIGN KEY ("program_id") REFERENCES "incentive_programs"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "incentive_events" ADD CONSTRAINT "FK_d0995a7cde727875308affb0f2f" FOREIGN KEY ("benefit_id") REFERENCES "user_incentive_benefits"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "incentive_events" DROP CONSTRAINT "FK_d0995a7cde727875308affb0f2f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_incentive_benefits" DROP CONSTRAINT "FK_1b4b1a0fdacdfd9bfaaa89f1e6c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_incentive_benefits" DROP CONSTRAINT "FK_5de4d7ca1020bb0d999b5ca2ed3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_incentive_event_benefit"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."uq_incentive_event_idempotency"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."uq_incentive_event_reference"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."uq_incentive_event_reversal"`,
    );
    await queryRunner.query(`DROP INDEX "public"."uq_incentive_event_award"`);
    await queryRunner.query(`DROP TABLE "incentive_events"`);
    await queryRunner.query(`DROP INDEX "public"."uq_incentive_user_program"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_incentive_benefit_reviewed"`,
    );
    await queryRunner.query(`DROP TABLE "user_incentive_benefits"`);
    await queryRunner.query(`DROP TABLE "incentive_programs"`);
  }
}
