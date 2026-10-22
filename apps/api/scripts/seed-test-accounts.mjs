// Local development only. Run from apps/api: node scripts/seed-test-accounts.mjs
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { Client } from 'pg';
import { AdminRole } from '@purposemint/contracts';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');
const target = new URL(databaseUrl);
if (
  process.env.NODE_ENV !== 'development' ||
  !['localhost', '127.0.0.1', 'db'].includes(target.hostname) ||
  target.pathname !== '/purposemint'
) {
  throw new Error('Test accounts may only be seeded into the local development database.');
}

const accounts = [
  {
    email: 'manager@purposemint.local',
    password: 'Manager123!',
    firstName: 'Manager',
    lastName: 'Test',
    displayName: 'Manager',
    role: AdminRole.MANAGER,
  },
];

const client = new Client({ connectionString: databaseUrl });
try {
  await client.connect();
  await client.query('BEGIN');
  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    const inserted = await client.query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name, display_name,
        user_type, admin_role, status, email_verified_at,
        notification_preferences, policy_agreements
      ) VALUES ($1, $2, $3, $4, $5, 'admin', $6, 'active', NOW(), '{}'::jsonb, '{}'::jsonb)
      ON CONFLICT (email) DO NOTHING
      RETURNING id`,
      [account.email, passwordHash, account.firstName, account.lastName, account.displayName, account.role],
    );
    if (!inserted.rowCount) {
      const existing = await client.query(
        `SELECT user_type, admin_role, custom_role_id, status, deleted_at, password_hash
         FROM users WHERE email = $1`,
        [account.email],
      );
      const user = existing.rows[0];
      if (
        user.user_type !== 'admin' || user.admin_role !== account.role ||
        user.custom_role_id !== null || user.status !== 'active' ||
        user.deleted_at !== null || !await bcrypt.compare(account.password, user.password_hash)
      ) {
        throw new Error(`Existing account ${account.email} differs from the fixture; it was not modified.`);
      }
    }
    console.log(`${inserted.rowCount ? 'Created' : 'Already exists'}: ${account.email} (${account.role})`);
  }
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
