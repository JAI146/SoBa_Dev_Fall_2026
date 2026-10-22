import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminReportingHierarchy1792368000000 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE users ADD COLUMN reports_to_user_id uuid REFERENCES users(id) ON DELETE RESTRICT;
      CREATE INDEX idx_users_reports_to ON users(reports_to_user_id);
      ALTER TABLE users ADD CONSTRAINT chk_admin_reporting CHECK (
        reports_to_user_id IS NULL OR (user_type = 'admin' AND admin_role IS DISTINCT FROM 'super_admin' AND reports_to_user_id <> id)
      )`);
    await runner.query(`CREATE FUNCTION validate_admin_reporting() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM pg_advisory_xact_lock(1792368000);
        IF NEW.reports_to_user_id IS NOT NULL THEN
          IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.reports_to_user_id AND user_type = 'admin' AND deleted_at IS NULL) THEN
            RAISE EXCEPTION 'Reporting parent must be an administrative account';
          END IF;
          IF EXISTS (WITH RECURSIVE ancestors AS (
            SELECT id, reports_to_user_id FROM users WHERE id = NEW.reports_to_user_id
            UNION SELECT u.id, u.reports_to_user_id FROM users u JOIN ancestors a ON u.id = a.reports_to_user_id
          ) SELECT 1 FROM ancestors WHERE id = NEW.id) THEN
            RAISE EXCEPTION 'Reporting hierarchy cannot contain a cycle';
          END IF;
        END IF;
        IF (NEW.user_type <> 'admin' OR NEW.deleted_at IS NOT NULL) AND EXISTS (SELECT 1 FROM users WHERE reports_to_user_id = NEW.id) THEN
          RAISE EXCEPTION 'Reassign direct reports before removing their supervisor';
        END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER trg_admin_reporting BEFORE INSERT OR UPDATE OF reports_to_user_id, user_type, admin_role, deleted_at ON users
      FOR EACH ROW EXECUTE FUNCTION validate_admin_reporting()`);
  }

  async down(runner: QueryRunner) {
    await runner.query(
      'DROP TRIGGER trg_admin_reporting ON users; DROP FUNCTION validate_admin_reporting(); ALTER TABLE users DROP CONSTRAINT chk_admin_reporting; ALTER TABLE users DROP COLUMN reports_to_user_id',
    );
  }
}
