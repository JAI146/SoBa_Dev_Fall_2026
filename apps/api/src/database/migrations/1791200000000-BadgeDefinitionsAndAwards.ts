import { MigrationInterface, QueryRunner } from 'typeorm';

export class BadgeDefinitionsAndAwards1791200000000 implements MigrationInterface {
  name = 'BadgeDefinitionsAndAwards1791200000000';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE FUNCTION badge_criteria_valid(criteria jsonb) RETURNS boolean
      LANGUAGE plpgsql IMMUTABLE AS $$
      DECLARE rule jsonb; amount numeric;
      BEGIN
        IF jsonb_typeof(criteria) <> 'array' THEN RETURN false; END IF;
        IF jsonb_array_length(criteria) NOT BETWEEN 1 AND 20 THEN RETURN false; END IF;
        FOR rule IN SELECT * FROM jsonb_array_elements(criteria) LOOP
          IF jsonb_typeof(rule) <> 'object' OR NOT rule ?& ARRAY['variable', 'operator', 'not', 'value']
            OR (SELECT count(*) FROM jsonb_object_keys(rule)) <> 4
            OR jsonb_typeof(rule->'variable') <> 'string'
            OR rule->>'variable' NOT IN ('savings_progress','saved_amount','completed_goals','habit_completions','reflections','current_level')
            OR jsonb_typeof(rule->'operator') <> 'string' OR rule->>'operator' NOT IN ('=','<','<=','>','>=')
            OR jsonb_typeof(rule->'not') <> 'boolean' OR jsonb_typeof(rule->'value') <> 'number'
          THEN RETURN false; END IF;
          amount := (rule->>'value')::numeric;
          IF amount < 0 THEN RETURN false; END IF;
          IF rule->>'variable' = 'savings_progress' AND amount > 100 THEN RETURN false; END IF;
          IF rule->>'variable' NOT IN ('savings_progress','saved_amount') AND
            (amount <> trunc(amount) OR amount > 9007199254740991) THEN RETURN false; END IF;
          IF rule->>'variable' = 'current_level' AND amount NOT BETWEEN 1 AND 5 THEN RETURN false; END IF;
        END LOOP;
        RETURN true;
      END $$`);
    await runner.query(`CREATE TABLE badge_definitions (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      name varchar(150) NOT NULL CHECK (length(trim(name)) > 0),
      description text NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 2000),
      category varchar(100) NOT NULL CHECK (length(trim(category)) > 0),
      icon_emoji varchar(64) NOT NULL CHECK (length(trim(icon_emoji)) > 0),
      criteria jsonb NOT NULL CHECK (badge_criteria_valid(criteria)),
      active boolean NOT NULL DEFAULT false,
      reward varchar(500) DEFAULT NULL CHECK (reward IS NULL OR length(trim(reward)) > 0),
      version integer NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await runner.query(`CREATE TABLE badge_awards (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      badge_id uuid NOT NULL REFERENCES badge_definitions(id) ON DELETE RESTRICT,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      unlocked_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_badge_awards_badge_user UNIQUE (badge_id, user_id)
    )`);
    await runner.query(
      `CREATE INDEX idx_badge_awards_user_id ON badge_awards(user_id)`,
    );
    // Both award inserts and definition edits lock the same row to serialize first-award races.
    await runner.query(`CREATE FUNCTION protect_badge_definition() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF EXISTS (SELECT 1 FROM badge_awards WHERE badge_id = OLD.id) THEN
          RAISE EXCEPTION 'Awarded badge definitions cannot be edited or deleted' USING ERRCODE = '23514';
        END IF;
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
      END $$`);
    await runner.query(`CREATE TRIGGER protect_badge_definition BEFORE UPDATE OR DELETE ON badge_definitions
      FOR EACH ROW EXECUTE FUNCTION protect_badge_definition()`);
    await runner.query(`CREATE FUNCTION protect_badge_award() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE enabled boolean;
      BEGIN
        IF TG_OP <> 'INSERT' THEN
          RAISE EXCEPTION 'Badge award history is immutable' USING ERRCODE = '23514';
        END IF;
        SELECT active INTO enabled FROM badge_definitions WHERE id = NEW.badge_id FOR UPDATE;
        IF enabled IS DISTINCT FROM true THEN
          RAISE EXCEPTION 'Only active badges can be awarded' USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
      END $$`);
    await runner.query(`CREATE TRIGGER protect_badge_award BEFORE INSERT OR UPDATE OR DELETE ON badge_awards
      FOR EACH ROW EXECUTE FUNCTION protect_badge_award()`);
    await runner.query(`CREATE FUNCTION reject_badge_history_truncate() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Badge award history cannot be truncated' USING ERRCODE = '23514'; END $$`);
    await runner.query(`CREATE TRIGGER reject_badge_history_truncate BEFORE TRUNCATE ON badge_awards
      FOR EACH STATEMENT EXECUTE FUNCTION reject_badge_history_truncate()`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM badge_awards) THEN
        RAISE EXCEPTION 'Cannot revert badges while award history exists';
      END IF;
    END $$`);
    await runner.query(`DROP TABLE badge_awards`);
    await runner.query(`DROP TABLE badge_definitions`);
    await runner.query(`DROP FUNCTION protect_badge_award()`);
    await runner.query(`DROP FUNCTION reject_badge_history_truncate()`);
    await runner.query(`DROP FUNCTION protect_badge_definition()`);
    await runner.query(`DROP FUNCTION badge_criteria_valid(jsonb)`);
  }
}
