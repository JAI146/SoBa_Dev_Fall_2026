// Creates the database named in DATABASE_URL, if it does not exist yet.
// This is a convenience for local setup only — schema comes from migrations.
import "dotenv/config";
import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env first.");
  process.exit(1);
}

const url = new URL(databaseUrl);
const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
  throw new Error(
    "The database name in DATABASE_URL may contain only letters, numbers and underscores",
  );
}

// Connect to the always-present `postgres` database to issue CREATE DATABASE.
url.pathname = "/postgres";

const client = new Client({ connectionString: url.toString() });

try {
  await client.connect();
  const result = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [databaseName],
  );
  if (result.rowCount === 0) {
    await client.query('CREATE DATABASE "' + databaseName + '"');
    console.log("Created database " + databaseName);
  } else {
    console.log("Database " + databaseName + " already exists");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
