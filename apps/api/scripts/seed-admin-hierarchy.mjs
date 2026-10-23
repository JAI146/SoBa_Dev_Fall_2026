import 'dotenv/config';
import bcrypt from 'bcrypt';
import { Client } from 'pg';

const url = new URL(process.env.DATABASE_URL ?? '');
if (
  process.env.NODE_ENV !== 'development' ||
  !['localhost', '127.0.0.1', 'db'].includes(url.hostname) ||
  url.pathname !== '/purposemint'
)
  throw new Error('Only the local development database may be seeded.');
const staff = [
  ['nesha', 'Nesha', 'Brown', 'super_admin', null],
  ['syed', 'Syed', 'Talha', 'super_admin', null],
  ['maya', 'Maya', 'Chen', 'manager', 'nesha'],
  ['noah', 'Noah', 'Williams', 'manager', 'syed'],
  ['owen', 'Owen', 'Reed', 'editor', 'maya'],
  ['iris', 'Iris', 'Patel', 'auditor', 'maya'],
  ['lena', 'Lena', 'Brooks', 'support', 'maya'],
  ['eva', 'Eva', 'Torres', 'editor', 'noah'],
  ['amir', 'Amir', 'Khan', 'auditor', 'noah'],
  ['theo', 'Theo', 'Park', 'support', 'noah'],
];
const client = new Client({ connectionString: url.toString() });
try {
  await client.connect();
  await client.query('BEGIN');
  const hash = await bcrypt.hash('PurposeMint123!', 12);
  const ids = new Map();
  for (const [key, first, last, role, boss] of staff) {
    const email = `${key}@purposemint.local`;
    const inserted = await client.query(
      `INSERT INTO users (email,password_hash,first_name,last_name,display_name,user_type,admin_role,status,email_verified_at,notification_preferences,policy_agreements,reports_to_user_id)
      VALUES ($1,$2,$3,$4,$3,'admin',$5,'active',NOW(),'{}','{}',$6) ON CONFLICT (email) DO NOTHING RETURNING id`,
      [email, hash, first, last, role, boss ? ids.get(boss) : null],
    );
    const existing =
      inserted.rows[0] ??
      (
        await client.query(
          'SELECT id, user_type, admin_role FROM users WHERE email=$1 AND deleted_at IS NULL',
          [email],
        )
      ).rows[0];
    if (
      !existing ||
      (!inserted.rowCount &&
        (existing.user_type !== 'admin' || existing.admin_role !== role))
    )
      throw new Error(`Existing ${email} differs; no accounts were changed.`);
    ids.set(key, existing.id);
    console.log(
      `${inserted.rowCount ? 'Created' : 'Preserved'} ${email} (${role})`,
    );
  }
  const assigned = await client.query(
    `UPDATE users SET reports_to_user_id=$1 WHERE user_type='admin' AND admin_role IS DISTINCT FROM 'super_admin' AND reports_to_user_id IS NULL AND deleted_at IS NULL`,
    [ids.get('nesha')],
  );
  console.log(
    `Assigned ${assigned.rowCount} previously unassigned staff to Nesha; existing reporting lines were preserved.`,
  );
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
