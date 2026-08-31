import { MigrationInterface, QueryRunner } from "typeorm";

export class Reflections1788197894465 implements MigrationInterface {
    name = 'Reflections1788197894465'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "reflection_themes" ("key" character varying(80) NOT NULL, "label" character varying(100) NOT NULL, "color_token" character varying(40) NOT NULL, "match_keywords" text array NOT NULL, "encouragement_line" character varying(255) NOT NULL, "sort_order" integer NOT NULL, CONSTRAINT "PK_8949290aef4880db34d25059479" PRIMARY KEY ("key"))`);
        await queryRunner.query(`CREATE TABLE "reflection_theme_matches" ("reflection_id" uuid NOT NULL, "theme_key" character varying(80) NOT NULL, CONSTRAINT "PK_c668d4525e812da7bbe5d894f5b" PRIMARY KEY ("reflection_id", "theme_key"))`);
        await queryRunner.query(`CREATE TYPE "public"."reflections_kind_enum" AS ENUM('text', 'voice')`);
        await queryRunner.query(`CREATE TABLE "reflections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "kind" "public"."reflections_kind_enum" NOT NULL, "body" text, "mood_score" smallint, "duration_seconds" integer, "reflected_on" date NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4154d824fef84e88b13fbe26b06" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3e6512a53960497a5937ab2e02" ON "reflections" ("user_id", "reflected_on") `);
        await queryRunner.query(`ALTER TABLE "reflection_theme_matches" ADD CONSTRAINT "FK_0b884357937cf392e708c935de4" FOREIGN KEY ("reflection_id") REFERENCES "reflections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reflection_theme_matches" ADD CONSTRAINT "FK_4086e4b1d7bd619dfd24f4638d8" FOREIGN KEY ("theme_key") REFERENCES "reflection_themes"("key") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reflections" ADD CONSTRAINT "FK_f1c8839d90e44918e26b56cbb2e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reflections" DROP CONSTRAINT "FK_f1c8839d90e44918e26b56cbb2e"`);
        await queryRunner.query(`ALTER TABLE "reflection_theme_matches" DROP CONSTRAINT "FK_4086e4b1d7bd619dfd24f4638d8"`);
        await queryRunner.query(`ALTER TABLE "reflection_theme_matches" DROP CONSTRAINT "FK_0b884357937cf392e708c935de4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3e6512a53960497a5937ab2e02"`);
        await queryRunner.query(`DROP TABLE "reflections"`);
        await queryRunner.query(`DROP TYPE "public"."reflections_kind_enum"`);
        await queryRunner.query(`DROP TABLE "reflection_theme_matches"`);
        await queryRunner.query(`DROP TABLE "reflection_themes"`);
    }

}
