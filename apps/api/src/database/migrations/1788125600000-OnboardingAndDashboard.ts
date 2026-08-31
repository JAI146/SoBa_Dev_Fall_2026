import { MigrationInterface, QueryRunner } from "typeorm";

export class OnboardingAndDashboard1788125600000 implements MigrationInterface {
    name = 'OnboardingAndDashboard1788125600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "display_name" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "onboarding_completed_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "users" ADD "onboarding_goal_skipped" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "time_zone" character varying(100)`);
        await queryRunner.query(`UPDATE "users" SET "onboarding_completed_at" = COALESCE("updated_at", now()) WHERE "onboarding_status" = 'completed' AND "onboarding_completed_at" IS NULL`);

        await queryRunner.query(`CREATE TABLE "values" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying(100) NOT NULL, "label" character varying(100) NOT NULL, "description" character varying(255) NOT NULL, "icon_name" character varying(80) NOT NULL, "color_token" character varying(40) NOT NULL, "sort_order" integer NOT NULL, CONSTRAINT "PK_values_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_values_key" ON "values" ("key")`);

        await queryRunner.query(`CREATE TABLE "goal_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(150) NOT NULL, "value_key" character varying(100) NOT NULL, "target_amount" numeric(10,2) NOT NULL, "is_pathway_eligible" boolean NOT NULL DEFAULT false, "icon_emoji" character varying(16) NOT NULL, "sort_order" integer NOT NULL, CONSTRAINT "PK_goal_templates_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_goal_templates_pathway" ON "goal_templates" ("is_pathway_eligible")`);
        await queryRunner.query(`ALTER TABLE "goal_templates" ADD CONSTRAINT "FK_goal_templates_value_key" FOREIGN KEY ("value_key") REFERENCES "values"("key") ON DELETE RESTRICT ON UPDATE NO ACTION`);

        await queryRunner.query(`CREATE TYPE "public"."habit_templates_frequency_enum" AS ENUM('daily', 'weekly', 'as_needed')`);
        await queryRunner.query(`CREATE TYPE "public"."habit_templates_category_enum" AS ENUM('money', 'mindset', 'motivation')`);
        await queryRunner.query(`CREATE TABLE "habit_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(150) NOT NULL, "description" character varying(255) NOT NULL, "frequency" "public"."habit_templates_frequency_enum" NOT NULL, "category" "public"."habit_templates_category_enum" NOT NULL, "icon_emoji" character varying(16) NOT NULL, "sort_order" integer NOT NULL, CONSTRAINT "PK_habit_templates_id" PRIMARY KEY ("id"))`);

        await queryRunner.query(`CREATE TABLE "user_values" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "value_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_user_values_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_user_values_user_id" ON "user_values" ("user_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_user_values_user_value" ON "user_values" ("user_id", "value_id")`);
        await queryRunner.query(`ALTER TABLE "user_values" ADD CONSTRAINT "FK_user_values_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_values" ADD CONSTRAINT "FK_user_values_value_id" FOREIGN KEY ("value_id") REFERENCES "values"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        await queryRunner.query(`CREATE TABLE "user_goals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "title" character varying(150) NOT NULL, "target_amount" numeric(10,2) NOT NULL, "saved_amount" numeric(10,2) NOT NULL DEFAULT '0', "source_template_id" uuid, "is_active" boolean NOT NULL DEFAULT true, "is_focus" boolean NOT NULL DEFAULT false, "is_pathway_eligible" boolean NOT NULL DEFAULT false, "icon_emoji" character varying(16) NOT NULL DEFAULT '🎯', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_user_goals_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_user_goals_user_id" ON "user_goals" ("user_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_user_goals_one_focus" ON "user_goals" ("user_id") WHERE "is_focus" = true`);
        await queryRunner.query(`ALTER TABLE "user_goals" ADD CONSTRAINT "FK_user_goals_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_goals" ADD CONSTRAINT "FK_user_goals_source_template_id" FOREIGN KEY ("source_template_id") REFERENCES "goal_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

        await queryRunner.query(`CREATE TABLE "user_habits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "source_template_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_user_habits_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_user_habits_user_id" ON "user_habits" ("user_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_user_habits_user_template" ON "user_habits" ("user_id", "source_template_id")`);
        await queryRunner.query(`ALTER TABLE "user_habits" ADD CONSTRAINT "FK_user_habits_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_habits" ADD CONSTRAINT "FK_user_habits_source_template_id" FOREIGN KEY ("source_template_id") REFERENCES "habit_templates"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);

        await queryRunner.query(`CREATE TABLE "habit_completions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "user_habit_id" uuid NOT NULL, "completed_on" date NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_habit_completions_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_habit_completions_user_id" ON "habit_completions" ("user_id")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_habit_completions_habit_day" ON "habit_completions" ("user_habit_id", "completed_on")`);
        await queryRunner.query(`ALTER TABLE "habit_completions" ADD CONSTRAINT "FK_habit_completions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "habit_completions" ADD CONSTRAINT "FK_habit_completions_user_habit_id" FOREIGN KEY ("user_habit_id") REFERENCES "user_habits"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        await queryRunner.query(`CREATE TABLE "savings_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "user_goal_id" uuid NOT NULL, "amount" numeric(10,2) NOT NULL, "note" character varying(200), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_savings_entries_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_savings_entries_user_id" ON "savings_entries" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "idx_savings_entries_goal_id" ON "savings_entries" ("user_goal_id")`);
        await queryRunner.query(`ALTER TABLE "savings_entries" ADD CONSTRAINT "FK_savings_entries_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "savings_entries" ADD CONSTRAINT "FK_savings_entries_user_goal_id" FOREIGN KEY ("user_goal_id") REFERENCES "user_goals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "savings_entries" DROP CONSTRAINT "FK_savings_entries_user_goal_id"`);
        await queryRunner.query(`ALTER TABLE "savings_entries" DROP CONSTRAINT "FK_savings_entries_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_savings_entries_goal_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_savings_entries_user_id"`);
        await queryRunner.query(`DROP TABLE "savings_entries"`);

        await queryRunner.query(`ALTER TABLE "habit_completions" DROP CONSTRAINT "FK_habit_completions_user_habit_id"`);
        await queryRunner.query(`ALTER TABLE "habit_completions" DROP CONSTRAINT "FK_habit_completions_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."uq_habit_completions_habit_day"`);
        await queryRunner.query(`DROP INDEX "public"."idx_habit_completions_user_id"`);
        await queryRunner.query(`DROP TABLE "habit_completions"`);

        await queryRunner.query(`ALTER TABLE "user_habits" DROP CONSTRAINT "FK_user_habits_source_template_id"`);
        await queryRunner.query(`ALTER TABLE "user_habits" DROP CONSTRAINT "FK_user_habits_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."uq_user_habits_user_template"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_habits_user_id"`);
        await queryRunner.query(`DROP TABLE "user_habits"`);

        await queryRunner.query(`ALTER TABLE "user_goals" DROP CONSTRAINT "FK_user_goals_source_template_id"`);
        await queryRunner.query(`ALTER TABLE "user_goals" DROP CONSTRAINT "FK_user_goals_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."uq_user_goals_one_focus"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_goals_user_id"`);
        await queryRunner.query(`DROP TABLE "user_goals"`);

        await queryRunner.query(`ALTER TABLE "user_values" DROP CONSTRAINT "FK_user_values_value_id"`);
        await queryRunner.query(`ALTER TABLE "user_values" DROP CONSTRAINT "FK_user_values_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."uq_user_values_user_value"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_values_user_id"`);
        await queryRunner.query(`DROP TABLE "user_values"`);

        await queryRunner.query(`DROP TABLE "habit_templates"`);
        await queryRunner.query(`DROP TYPE "public"."habit_templates_category_enum"`);
        await queryRunner.query(`DROP TYPE "public"."habit_templates_frequency_enum"`);

        await queryRunner.query(`ALTER TABLE "goal_templates" DROP CONSTRAINT "FK_goal_templates_value_key"`);
        await queryRunner.query(`DROP INDEX "public"."idx_goal_templates_pathway"`);
        await queryRunner.query(`DROP TABLE "goal_templates"`);

        await queryRunner.query(`DROP INDEX "public"."uq_values_key"`);
        await queryRunner.query(`DROP TABLE "values"`);

        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "time_zone"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "onboarding_goal_skipped"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "onboarding_completed_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "display_name"`);
    }
}
