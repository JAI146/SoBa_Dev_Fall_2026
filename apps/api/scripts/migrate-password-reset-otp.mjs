import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { Client } from "pg";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
try {
  const content = readFileSync(resolve(currentDirectory, "../.env"), "utf8");
  for (const line of content.split("\n")) {
    const separator = line.indexOf("=");
    if (separator < 1 || line.trim().startsWith("#")) continue;
    const key = line.slice(0, separator).trim();
    if (!(key in process.env)) {
      process.env[key] = line.slice(separator + 1).trim();
    }
  }
} catch {
  // The local .env file is optional.
}

const client = new Client({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USERNAME ?? "postgres",
  password: process.env.DB_PASSWORD ?? "postgres",
  database: process.env.DB_NAME ?? "purposemint",
});

try {
  await client.connect();
  await client.query(
    readFileSync(
      resolve(currentDirectory, "migrate-password-reset-otp.sql"),
      "utf8",
    ),
  );
  console.log("Password reset columns migrated successfully.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
