import { Client } from "pg";

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
    ["muakhah"],
  );
  if (result.rowCount === 0) {
    await client.query("CREATE DATABASE muakhah");
    console.log("Created database muakhah");
  } else {
    console.log("Database muakhah already exists");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
