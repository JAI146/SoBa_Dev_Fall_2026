import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1788122176124 implements MigrationInterface {
    name = 'InitialSchema1788122176124'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_user_type_enum" AS ENUM('customer', 'admin')`);
        await queryRunner.query(`CREATE TYPE "public"."users_admin_role_enum" AS ENUM('super_admin')`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('pending_email', 'active', 'suspended')`);
        await queryRunner.query(`CREATE TYPE "public"."users_onboarding_status_enum" AS ENUM('not_started', 'in_progress', 'completed')`);
        await queryRunner.query(`CREATE TYPE "public"."users_tier_enum" AS ENUM('free', 'growth', 'elevate')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "profile_image_url" character varying(500), "country" character varying(100), "state" character varying(100), "city" character varying(100), "user_type" "public"."users_user_type_enum" NOT NULL DEFAULT 'customer', "admin_role" "public"."users_admin_role_enum", "status" "public"."users_status_enum" NOT NULL DEFAULT 'pending_email', "email_verified_at" TIMESTAMP WITH TIME ZONE, "onboarding_status" "public"."users_onboarding_status_enum" NOT NULL DEFAULT 'not_started', "tier" "public"."users_tier_enum" NOT NULL DEFAULT 'free', "notification_preferences" jsonb NOT NULL DEFAULT '{}', "policy_agreements" jsonb NOT NULL DEFAULT '{}', "delete_account_requested_at" TIMESTAMP WITH TIME ZONE, "last_login_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email") `);
        await queryRunner.query(`CREATE INDEX "idx_users_deleted_at" ON "users" ("deleted_at") `);
        await queryRunner.query(`CREATE INDEX "idx_users_status" ON "users" ("status") `);
        await queryRunner.query(`CREATE TYPE "public"."user_sessions_client_type_enum" AS ENUM('mobile', 'dashboard')`);
        await queryRunner.query(`CREATE TABLE "user_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "family_id" uuid NOT NULL, "token_hash" character varying(64) NOT NULL, "client_type" "public"."user_sessions_client_type_enum" NOT NULL, "user_agent" character varying(512), "ip_address" character varying(64), "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "rotated_at" TIMESTAMP WITH TIME ZONE, "revoked_at" TIMESTAMP WITH TIME ZONE, "revoked_reason" character varying(100), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e93e031a5fed190d4789b6bfd83" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_user_sessions_token_hash" ON "user_sessions" ("token_hash") `);
        await queryRunner.query(`CREATE INDEX "idx_user_sessions_family_id" ON "user_sessions" ("family_id") `);
        await queryRunner.query(`CREATE INDEX "idx_user_sessions_user_id" ON "user_sessions" ("user_id") `);
        await queryRunner.query(`CREATE TYPE "public"."user_otps_type_enum" AS ENUM('email_verification', 'password_reset')`);
        await queryRunner.query(`CREATE TABLE "user_otps" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" "public"."user_otps_type_enum" NOT NULL, "code_hash" character varying(255) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "consumed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_058cf61bf2024c3a3c3bfc4e1b7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_user_otps_user_type_consumed" ON "user_otps" ("user_id", "type", "consumed_at") `);
        await queryRunner.query(`CREATE TABLE "smtp_config" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "smtp_server" character varying(255) NOT NULL, "smtp_port" integer NOT NULL, "smtp_email_user" character varying(255) NOT NULL, "smtp_email_password" text NOT NULL, "smtp_bcc" character varying(255), "smtp_enabled" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ae1ade2582b94de6ba053248412" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "s3_config" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "access_key_id" character varying(255) NOT NULL, "secret_access_key" text NOT NULL, "region" character varying(100) NOT NULL, "bucket" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_dacebe78280c3465fd420c15386" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."audit_events_actor_type_enum" AS ENUM('user', 'admin', 'system')`);
        await queryRunner.query(`CREATE TYPE "public"."audit_events_outcome_enum" AS ENUM('success', 'failure')`);
        await queryRunner.query(`CREATE TABLE "audit_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actor_user_id" uuid, "actor_type" "public"."audit_events_actor_type_enum" NOT NULL, "action" character varying(100) NOT NULL, "entity_type" character varying(100), "entity_id" character varying(100), "outcome" "public"."audit_events_outcome_enum" NOT NULL, "metadata" jsonb, "ip_address" character varying(64), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_910f64d901a5c3e9878f0d4a407" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_audit_events_action" ON "audit_events" ("action") `);
        await queryRunner.query(`CREATE INDEX "idx_audit_events_actor_user_id" ON "audit_events" ("actor_user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_audit_events_created_at" ON "audit_events" ("created_at") `);
        await queryRunner.query(`ALTER TABLE "user_sessions" ADD CONSTRAINT "FK_e9658e959c490b0a634dfc54783" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_otps" ADD CONSTRAINT "FK_e91ac77ead5e7f97b11a6fba6b3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_otps" DROP CONSTRAINT "FK_e91ac77ead5e7f97b11a6fba6b3"`);
        await queryRunner.query(`ALTER TABLE "user_sessions" DROP CONSTRAINT "FK_e9658e959c490b0a634dfc54783"`);
        await queryRunner.query(`DROP INDEX "public"."idx_audit_events_created_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_audit_events_actor_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_audit_events_action"`);
        await queryRunner.query(`DROP TABLE "audit_events"`);
        await queryRunner.query(`DROP TYPE "public"."audit_events_outcome_enum"`);
        await queryRunner.query(`DROP TYPE "public"."audit_events_actor_type_enum"`);
        await queryRunner.query(`DROP TABLE "s3_config"`);
        await queryRunner.query(`DROP TABLE "smtp_config"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_otps_user_type_consumed"`);
        await queryRunner.query(`DROP TABLE "user_otps"`);
        await queryRunner.query(`DROP TYPE "public"."user_otps_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_sessions_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_sessions_family_id"`);
        await queryRunner.query(`DROP INDEX "public"."uq_user_sessions_token_hash"`);
        await queryRunner.query(`DROP TABLE "user_sessions"`);
        await queryRunner.query(`DROP TYPE "public"."user_sessions_client_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_users_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_users_deleted_at"`);
        await queryRunner.query(`DROP INDEX "public"."uq_users_email"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_tier_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_onboarding_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_admin_role_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_user_type_enum"`);
    }

}
