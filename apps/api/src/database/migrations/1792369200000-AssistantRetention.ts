import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AssistantRetention1792369200000 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(
      'CREATE INDEX assistant_turns_retention_date ON assistant_turns(created_at)',
    );
  }

  async down(runner: QueryRunner) {
    await runner.query('DROP INDEX assistant_turns_retention_date');
  }
}
