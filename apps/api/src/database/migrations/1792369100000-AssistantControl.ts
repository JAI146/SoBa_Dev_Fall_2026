import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AssistantControl1792369100000 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      CREATE TABLE assistant_settings (
        singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
        limit_cents integer NOT NULL CHECK (limit_cents BETWEEN 0 AND 10000000),
        mode text NOT NULL CHECK (mode IN ('flexible', 'balanced')),
        revision integer NOT NULL DEFAULT 0
      );
      INSERT INTO assistant_settings (limit_cents, mode) VALUES (2500, 'flexible');
      CREATE TABLE assistant_access (
        user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        status text NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'revoked', 'builtin')),
        request_note text NOT NULL,
        requested_at timestamptz NOT NULL DEFAULT now(),
        decided_by uuid REFERENCES users(id) ON DELETE SET NULL,
        decided_at timestamptz,
        share integer NOT NULL DEFAULT 10000 CHECK (share BETWEEN 0 AND 10000)
      );
      CREATE TABLE assistant_turns (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        conversation_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        prompt text NOT NULL,
        answer text,
        charts jsonb
      );
      INSERT INTO assistant_turns (id, user_id, conversation_id, created_at, prompt)
        SELECT a.id, u.id, a.id, a.created_at, a.metadata->>'prompt'
        FROM audit_events a JOIN users u ON u.id = a.actor_user_id
        WHERE a.action = 'admin.assistant_prompt' AND jsonb_typeof(a.metadata->'prompt') = 'string';
      UPDATE audit_events SET metadata = metadata - 'prompt'
        WHERE action = 'admin.assistant_prompt' AND metadata ? 'prompt';
      CREATE INDEX assistant_turns_user_date ON assistant_turns(user_id, created_at DESC, id DESC);
      CREATE TABLE assistant_usage (
        id uuid PRIMARY KEY,
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        nano_usd bigint NOT NULL CHECK (nano_usd >= 0),
        settled boolean NOT NULL DEFAULT false
      );
      CREATE INDEX assistant_usage_date ON assistant_usage(created_at, user_id);
    `);
  }

  async down(runner: QueryRunner) {
    await runner.query(`UPDATE audit_events a SET metadata = COALESCE(a.metadata, '{}'::jsonb) || jsonb_build_object('prompt', t.prompt)
      FROM assistant_turns t WHERE a.id = t.id AND a.action = 'admin.assistant_prompt'`);
    await runner.query(
      'DROP TABLE assistant_usage, assistant_turns, assistant_access, assistant_settings',
    );
  }
}
