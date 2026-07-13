import { Client } from "pg";

const databaseName = process.env.DB_NAME ?? "purposemint";
if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
  throw new Error("DB_NAME may contain only letters, numbers, and underscores");
}

const client = new Client({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USERNAME ?? "postgres",
  password: process.env.DB_PASSWORD ?? "postgres",
  database: "postgres",
});

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
