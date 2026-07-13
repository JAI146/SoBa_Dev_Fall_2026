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
    // .env is optional; fall back to defaults below
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
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [tableName],
  );
  return result.rows[0]?.exists === true;
}

async function getColumnDataType(tableName, columnName) {
  const result = await client.query(
    `SELECT data_type, udt_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2`,
    [tableName, columnName],
  );
  return result.rows[0] ?? null;
}

async function migrateSponsorshipStatuses() {
  if (!(await tableExists("sponsorships"))) {
    console.log("sponsorships table not found; skipping status migration");
    return;
  }

  await client.query(`
    ALTER TABLE sponsorships
    ADD COLUMN IF NOT EXISTS needs_clarification boolean NOT NULL DEFAULT false
  `);
  await client.query(`
    ALTER TABLE sponsorships
    ADD COLUMN IF NOT EXISTS activated_at timestamptz NULL
  `);
  await client.query(`
    ALTER TABLE sponsorships
    ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL
  `);

  const statusColumn = await getColumnDataType("sponsorships", "status");
  if (!statusColumn) {
    console.log("sponsorships.status column not found; skipping value migration");
    return;
  }

  if (
    statusColumn.data_type === "USER-DEFINED" ||
    statusColumn.udt_name === "sponsorships_status_enum"
  ) {
    await client.query(`
      ALTER TABLE sponsorships
      ALTER COLUMN status TYPE text USING status::text
    `);
    console.log("Converted sponsorships.status from enum to text");
  }

  const legacyCounts = await client.query(`
    SELECT status, COUNT(*)::int AS count
    FROM sponsorships
    WHERE status IN ('pending', 'need_clarification', 'approved', 'rejected')
    GROUP BY status
  `);

  if (legacyCounts.rowCount > 0) {
    console.log("Migrating legacy sponsorship statuses:", legacyCounts.rows);
  }

  await client.query(`
    UPDATE sponsorships
    SET status = 'requested', needs_clarification = false
    WHERE status = 'pending'
  `);
  await client.query(`
    UPDATE sponsorships
    SET status = 'requested', needs_clarification = true
    WHERE status = 'need_clarification'
  `);
  await client.query(`
    UPDATE sponsorships
    SET
      status = 'active',
      activated_at = COALESCE(activated_at, reviewed_at, created_at)
    WHERE status = 'approved'
  `);
  await client.query(`
    UPDATE sponsorships
    SET status = 'cancelled'
    WHERE status = 'rejected'
  `);

  const invalid = await client.query(`
    SELECT status, COUNT(*)::int AS count
    FROM sponsorships
    WHERE status NOT IN (
      'requested', 'active', 'paused', 'completed',
      'cancelled', 'stopped', 'disputed'
    )
    GROUP BY status
  `);

  if (invalid.rowCount > 0) {
    throw new Error(
      `Unexpected sponsorship statuses remain after migration: ${JSON.stringify(invalid.rows)}`,
    );
  }

  const enumExists = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM pg_type WHERE typname = 'sponsorships_status_enum'
    ) AS exists
  `);

  if (enumExists.rows[0]?.exists === true) {
    await client.query(`
      ALTER TABLE sponsorships
      ALTER COLUMN status DROP DEFAULT
    `).catch(() => {});

    try {
      await client.query(`DROP TYPE sponsorships_status_enum`);
      console.log("Dropped legacy sponsorships_status_enum type");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `Could not drop sponsorships_status_enum (${message}). Status values are migrated; TypeORM can still sync.`,
      );
    }
  }

  console.log("Sponsorship status migration complete");
  await recalculateFamilyCoverage();
}

async function recalculateFamilyCoverage() {
  if (!(await tableExists("families")) || !(await tableExists("sponsorships"))) {
    return;
  }

  await client.query(`
    UPDATE families f
    SET
      monthly_covered_amount = 0,
      monthly_remaining_amount = f.monthly_required_amount,
      coverage_status = 'not_covered'::families_coverage_status_enum
  `);

  await client.query(`
    UPDATE families f
    SET
      monthly_covered_amount = sub.total::numeric(12,2),
      monthly_remaining_amount = GREATEST(
        0,
        f.monthly_required_amount::numeric - sub.total::numeric
      )::numeric(12,2),
      coverage_status = CASE
        WHEN sub.total <= 0 THEN 'not_covered'
        WHEN sub.total >= f.monthly_required_amount::numeric THEN 'fully_covered'
        ELSE 'partially_covered'
      END::families_coverage_status_enum
    FROM (
      SELECT family_id, SUM(monthly_amount::numeric) AS total
      FROM sponsorships
      WHERE status = 'active'
      GROUP BY family_id
    ) sub
    WHERE f.id = sub.family_id
  `);

  console.log("Recalculated family coverage from active sponsorships");
}

try {
  await client.connect();
  await migrateSponsorshipStatuses();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
