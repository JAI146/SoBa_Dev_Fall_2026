import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { Client } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const envPath = resolve(__dirname, "../.env");
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // optional
  }
}

loadEnv();

const client = new Client({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USERNAME ?? "postgres",
  password: process.env.DB_PASSWORD ?? "postgres",
  database: process.env.DB_NAME ?? "muakhah",
});

async function tableExists(tableName) {
  const result = await client.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [tableName],
  );
  return result.rows[0]?.exists === true;
}

async function migrateAdminRbac() {
  if (!(await tableExists("users"))) {
    console.log("users table not found; skipping admin RBAC migration");
    return;
  }

  await client.query(`
    DO $$ BEGIN
      CREATE TYPE users_admin_role_enum AS ENUM (
        'super_admin',
        'family_manager',
        'content_moderator',
        'transfer_proof_reviewer',
        'system_administrator'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await client.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS admin_role users_admin_role_enum NULL
  `);

  await client.query(`
    UPDATE users
    SET admin_role = 'super_admin'
    WHERE user_type = 'admin' AND admin_role IS NULL
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_user_id uuid NOT NULL,
      actor_admin_role varchar(64) NULL,
      action varchar(100) NOT NULL,
      entity_type varchar(64) NOT NULL,
      entity_id uuid NULL,
      summary varchar(500) NOT NULL,
      metadata jsonb NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
    ON activity_logs (created_at DESC)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_activity_logs_action
    ON activity_logs (action)
  `);

  console.log("Admin RBAC migration complete");
}

try {
  await client.connect();
  await migrateAdminRbac();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
