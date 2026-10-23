import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PathwayCatalogManagement1791849600000 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(
      'ALTER TABLE pathways ADD COLUMN is_active boolean NOT NULL DEFAULT true, ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0)',
    );
    await runner.query(
      'ALTER TABLE partners ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0)',
    );
  }
  async down(runner: QueryRunner) {
    await runner.query('ALTER TABLE partners DROP COLUMN version');
    await runner.query(
      'ALTER TABLE pathways DROP COLUMN version, DROP COLUMN is_active',
    );
  }
}
