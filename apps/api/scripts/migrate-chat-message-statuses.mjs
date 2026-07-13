import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { Client } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

const VALID_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "edited",
  "escalated",
];

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

async function getEnumLabels(typeName) {
  const result = await client.query(
    `SELECT e.enumlabel
     FROM pg_enum e
     JOIN pg_type t ON e.enumtypid = t.oid
     WHERE t.typname = $1
     ORDER BY e.enumsortorder`,
    [typeName],
  );
  return result.rows.map((row) => row.enumlabel);
}

async function migrateChatMessageStatuses() {
  if (!(await tableExists("chat_messages"))) {
    console.log("chat_messages table not found; skipping status migration");
    return;
  }

  const statusColumn = await getColumnDataType("chat_messages", "status");
  if (!statusColumn) {
    console.log("chat_messages.status column not found; skipping");
    return;
  }

  if (
    statusColumn.data_type === "USER-DEFINED" &&
    statusColumn.udt_name === "chat_messages_status_enum"
  ) {
    const labels = await getEnumLabels("chat_messages_status_enum");
    for (const value of ["edited", "escalated"]) {
      if (!labels.includes(value)) {
        await client.query(
          `ALTER TYPE chat_messages_status_enum ADD VALUE '${value}'`,
        );
        console.log(`Added '${value}' to chat_messages_status_enum`);
      }
    }
  } else if (statusColumn.data_type === "text") {
    const invalid = await client.query(
      `SELECT status, COUNT(*)::int AS count
       FROM chat_messages
       WHERE status NOT IN (${VALID_STATUSES.map((_, i) => `$${i + 1}`).join(", ")})
       GROUP BY status`,
      VALID_STATUSES,
    );
    if (invalid.rowCount > 0) {
      throw new Error(
        `Unexpected chat message statuses: ${JSON.stringify(invalid.rows)}`,
      );
    }
    console.log("chat_messages.status is text with valid values");
  }

  console.log("Chat message status migration complete");
}

try {
  await client.connect();
  await migrateChatMessageStatuses();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
