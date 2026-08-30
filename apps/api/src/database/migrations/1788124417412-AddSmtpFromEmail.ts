import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSmtpFromEmail1788124417412 implements MigrationInterface {
    name = 'AddSmtpFromEmail1788124417412'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "smtp_config" ADD "from_email" character varying(255) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "smtp_config" DROP COLUMN "from_email"`);
    }

}
