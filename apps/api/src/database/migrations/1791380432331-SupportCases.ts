/**
 * Adds support/complaint cases and their configurable categories, and seeds the
 * default category list. Case history is not stored here; it lives in
 * audit_events. Rollback drops only these two tables.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_CATEGORIES: Array<[key: string, label: string]> = [
  ['account', 'Account'],
  ['savings', 'Savings'],
  ['payments_transactions', 'Payments/Transactions'],
  ['subscription', 'Subscription'],
  ['goals_habits', 'Goals/Habits'],
  ['pathways', 'Pathways'],
  ['technical_issue', 'Technical Issue'],
  ['complaint', 'Complaint'],
  ['other', 'Other'],
];

export class SupportCases1791380432331 implements MigrationInterface {
  name = 'SupportCases1791380432331';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "support_case_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying(60) NOT NULL, "label" character varying(80) NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', "active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_cb9d76a2187f9a741bc9a5e5bee" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_support_case_categories_key" ON "support_case_categories" ("key") `,
    );
    await queryRunner.query(
      `CREATE TABLE "support_cases" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "case_number" SERIAL NOT NULL, "user_id" uuid NOT NULL, "type" character varying(20) NOT NULL DEFAULT 'support', "category_id" uuid NOT NULL, "subject" character varying(200) NOT NULL, "description" text NOT NULL, "priority" character varying(20) NOT NULL DEFAULT 'normal', "status" character varying(30) NOT NULL DEFAULT 'new', "assignee_id" uuid, "escalation_reason" text, "escalated_at" TIMESTAMP WITH TIME ZONE, "resolution" text, "resolved_at" TIMESTAMP WITH TIME ZONE, "closed_at" TIMESTAMP WITH TIME ZONE, "created_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c4cc80fe374d1965c37576527b5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_support_cases_assignee" ON "support_cases" ("assignee_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_support_cases_status" ON "support_cases" ("status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_support_cases_user" ON "support_cases" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_support_cases_number" ON "support_cases" ("case_number") `,
    );
    await queryRunner.query(
      `ALTER TABLE "support_cases" ADD CONSTRAINT "FK_5a99a9d58af4a0e3093e2d14252" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_cases" ADD CONSTRAINT "FK_34fc1e279c32ed7cb4e33ce95b3" FOREIGN KEY ("category_id") REFERENCES "support_case_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_cases" ADD CONSTRAINT "FK_2f1e6014653c5cb65453c0f930a" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    for (const [index, [key, label]] of DEFAULT_CATEGORIES.entries()) {
      await queryRunner.query(
        `INSERT INTO "support_case_categories" ("key", "label", "sort_order") VALUES ($1, $2, $3)`,
        [key, label, index],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "support_cases" DROP CONSTRAINT "FK_2f1e6014653c5cb65453c0f930a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_cases" DROP CONSTRAINT "FK_34fc1e279c32ed7cb4e33ce95b3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_cases" DROP CONSTRAINT "FK_5a99a9d58af4a0e3093e2d14252"`,
    );
    await queryRunner.query(`DROP INDEX "public"."uq_support_cases_number"`);
    await queryRunner.query(`DROP INDEX "public"."idx_support_cases_user"`);
    await queryRunner.query(`DROP INDEX "public"."idx_support_cases_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_support_cases_assignee"`);
    await queryRunner.query(`DROP TABLE "support_cases"`);
    await queryRunner.query(
      `DROP INDEX "public"."uq_support_case_categories_key"`,
    );
    await queryRunner.query(`DROP TABLE "support_case_categories"`);
  }
}
