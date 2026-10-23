import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SuperAdminReportingPromotion1792368000001 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`CREATE FUNCTION normalize_super_admin_reporting() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.admin_role = 'super_admin' AND OLD.admin_role IS DISTINCT FROM 'super_admin' THEN
          NEW.reports_to_user_id := NULL;
        END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER trg_00_super_admin_reporting BEFORE UPDATE OF admin_role ON users
      FOR EACH ROW EXECUTE FUNCTION normalize_super_admin_reporting()`);
  }
  async down(runner: QueryRunner) {
    await runner.query(
      'DROP TRIGGER trg_00_super_admin_reporting ON users; DROP FUNCTION normalize_super_admin_reporting()',
    );
  }
}
