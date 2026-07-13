import fs from "fs";
import pg from "pg";

const envText = fs.readFileSync(new URL("../.env", import.meta.url), "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const client = new pg.Client({
  host: env.DB_HOST || "localhost",
  port: parseInt(env.DB_PORT || "5432", 10),
  user: env.DB_USERNAME || "postgres",
  password: env.DB_PASSWORD || "postgres",
  database: env.DB_NAME || "muakhah",
});

await client.connect();

const result = await client.query(`
  UPDATE sponsorships
  SET stop_notes = admin_notes
  WHERE status = 'stopped'
    AND stop_notes IS NULL
    AND admin_notes IS NOT NULL
    AND stopped_at IS NOT NULL
  RETURNING id, stop_notes
`);

console.log(`Backfilled ${result.rowCount} stopped sponsorship(s):`, result.rows);
await client.end();
