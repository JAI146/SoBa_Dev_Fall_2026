import { MigrationInterface, QueryRunner } from "typeorm";

export class Reflections1788200387472 implements MigrationInterface {
    name = 'Reflections1788200387472'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "subscription_plans" ("key" character varying(20) NOT NULL, "name" character varying(100) NOT NULL, "tagline" character varying(200) NOT NULL, "price_monthly" numeric(8,2) NOT NULL, "badge" character varying(100), "description" character varying(500) NOT NULL, "features" text array NOT NULL, "cta_label" character varying(100) NOT NULL, "sort_order" integer NOT NULL, CONSTRAINT "PK_3c928d7e53703c608bc957cdad9" PRIMARY KEY ("key"))`);
        await queryRunner.query(`CREATE TABLE "upgrade_intents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "plan_key" character varying(20) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_604ccf614b15b6dbb5cd16f0c7e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_31262c96d59822fa659c29ec3e" ON "upgrade_intents" ("user_id", "plan_key") `);
        await queryRunner.query(`CREATE TABLE "challenge_participations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "challenge_id" uuid NOT NULL, "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "completed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_0189680b469e66abe5de8cb6d8c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_05925ab7d15e7975d66ab4ed96" ON "challenge_participations" ("user_id", "challenge_id") `);
        await queryRunner.query(`CREATE TABLE "community_challenges" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying(120) NOT NULL, "title" character varying(160) NOT NULL, "description" character varying(500) NOT NULL, "active_month" date NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL, CONSTRAINT "PK_395b4753118a807b8801bb73df1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6e6666fe25094d010461b9dc01" ON "community_challenges" ("active_month", "is_active") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5d11722d4cbdf82a51dbdaf132" ON "community_challenges" ("key") `);
        await queryRunner.query(`ALTER TABLE "upgrade_intents" ADD CONSTRAINT "FK_7f29faeb1b746ee965694a817e0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "upgrade_intents" ADD CONSTRAINT "FK_0bcf1c2343f0ba18fdfff8bc943" FOREIGN KEY ("plan_key") REFERENCES "subscription_plans"("key") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "challenge_participations" ADD CONSTRAINT "FK_d5bfb647637e97f70a8316ccd42" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "challenge_participations" ADD CONSTRAINT "FK_ffb01fcefddc84e1615251bf6a6" FOREIGN KEY ("challenge_id") REFERENCES "community_challenges"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "challenge_participations" DROP CONSTRAINT "FK_ffb01fcefddc84e1615251bf6a6"`);
        await queryRunner.query(`ALTER TABLE "challenge_participations" DROP CONSTRAINT "FK_d5bfb647637e97f70a8316ccd42"`);
        await queryRunner.query(`ALTER TABLE "upgrade_intents" DROP CONSTRAINT "FK_0bcf1c2343f0ba18fdfff8bc943"`);
        await queryRunner.query(`ALTER TABLE "upgrade_intents" DROP CONSTRAINT "FK_7f29faeb1b746ee965694a817e0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5d11722d4cbdf82a51dbdaf132"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6e6666fe25094d010461b9dc01"`);
        await queryRunner.query(`DROP TABLE "community_challenges"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_05925ab7d15e7975d66ab4ed96"`);
        await queryRunner.query(`DROP TABLE "challenge_participations"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_31262c96d59822fa659c29ec3e"`);
        await queryRunner.query(`DROP TABLE "upgrade_intents"`);
        await queryRunner.query(`DROP TABLE "subscription_plans"`);
    }

}
