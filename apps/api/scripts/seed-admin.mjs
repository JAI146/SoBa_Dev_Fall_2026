// Seeds (or promotes) a super-admin with full dashboard access.
// Fill EMAIL and PASSWORD below, then from apps/api run:
//   pnpm seed:admin
//   node scripts/seed-admin.mjs
import "dotenv/config";
import bcrypt from "bcrypt";
import { Client } from "pg";

const EMAIL = "purposemint@gmail.com";
const PASSWORD = "purpose@123";

const BCRYPT_ROUNDS = 12;
const FIRST_NAME = "System";
const LAST_NAME = "Admin";
const NOTIFICATION_PREFERENCES = {
  productUpdates: true,
  goalReminders: true,
  weeklyCheckIn: true,
  securityAlerts: true,
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env first.");
  process.exit(1);
}

const email = EMAIL.trim().toLowerCase();
const password = PASSWORD;
if (!email || !password) {
  console.error("Set EMAIL and PASSWORD at the top of scripts/seed-admin.mjs, then run it again.");
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const existing = await client.query(
    `SELECT id FROM users WHERE email = $1 LIMIT 1`,
    [email],
  );

  if (existing.rowCount > 0) {
    await client.query(
      `UPDATE users
       SET password_hash = $1,
           user_type = 'admin',
           admin_role = 'super_admin',
           status = 'active',
           email_verified_at = COALESCE(email_verified_at, NOW()),
           deleted_at = NULL,
           updated_at = NOW()
       WHERE email = $2`,
      [passwordHash, email],
    );
    console.log("Updated existing user to super-admin:", email);
  } else {
    await client.query(
      `INSERT INTO users (
         email,
         password_hash,
         first_name,
         last_name,
         user_type,
         admin_role,
         status,
         email_verified_at,
         notification_preferences,
         policy_agreements
       ) VALUES ($1, $2, $3, $4, 'admin', 'super_admin', 'active', NOW(), $5::jsonb, '{}'::jsonb)`,
      [
        email,
        passwordHash,
        FIRST_NAME,
        LAST_NAME,
        JSON.stringify(NOTIFICATION_PREFERENCES),
      ],
    );
    console.log("Seeded super-admin:", email);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
