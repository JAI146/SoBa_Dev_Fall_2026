import bcrypt from 'bcrypt';
import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');

const client = new Client({ connectionString: databaseUrl });
const firstNames = [
  'Avery', 'Jordan', 'Taylor', 'Morgan', 'Riley', 'Cameron', 'Skyler', 'Casey',
  'Quinn', 'Parker', 'Reese', 'Drew', 'Rowan', 'Emerson', 'Finley', 'Sage',
  'Dakota', 'Jamie', 'Kendall', 'Alex', 'Devin', 'Robin', 'Hayden', 'Blair',
];
const lastNames = [
  'Bennett', 'Brooks', 'Campbell', 'Diaz', 'Edwards', 'Foster', 'Green', 'Hall',
  'Irving', 'Johnson', 'King', 'Lewis', 'Mitchell', 'Nelson', 'Owens', 'Price',
  'Reed', 'Scott', 'Turner', 'Walker', 'Young', 'Adams', 'Clark', 'Evans',
];

function uuid(group, index) {
  return `00000000-0000-4000-${group}-${String(index).padStart(12, '0')}`;
}

await client.connect();
try {
  await client.query('BEGIN');
  const passwordHash = await bcrypt.hash('Customer123!', 10);
  const pathways = (await client.query('SELECT key FROM pathways ORDER BY sort_order')).rows;
  if (!pathways.length) throw new Error('Reference data is missing; start the API before running the mock seed.');

  for (let index = 0; index < firstNames.length; index += 1) {
    const number = index + 1;
    const id = uuid('8000', number);
    const completed = index % 5 !== 0;
    const status = index % 11 === 0 ? 'suspended' : index % 7 === 0 ? 'pending_email' : 'active';
    const tier = index % 6 === 0 ? 'elevate' : index % 3 === 0 ? 'growth' : 'free';
    const createdDaysAgo = 2 + index * 3;
    const userResult = await client.query(
      `INSERT INTO users (
         id, email, password_hash, first_name, last_name, display_name, country,
         state, city, time_zone, user_type, status, email_verified_at,
         onboarding_status, onboarding_completed_at, tier, notification_preferences,
         policy_agreements, last_login_at, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $4, 'United States', 'Louisiana', 'Baton Rouge',
         'America/Chicago', 'customer', $6::users_status_enum,
         CASE WHEN $6::users_status_enum = 'pending_email' THEN NULL ELSE now() - ($9::int * interval '1 day') END,
         $7::users_onboarding_status_enum,
         CASE WHEN $7::users_onboarding_status_enum = 'completed' THEN now() - (($9::int - 1) * interval '1 day') ELSE NULL END,
         $8::users_tier_enum, '{"email":true,"push":true}'::jsonb, '{}'::jsonb,
         now() - (($9::int % 20) * interval '1 day'), now() - ($9::int * interval '1 day'), now()
       ) ON CONFLICT (email) DO UPDATE SET
         status = EXCLUDED.status, onboarding_status = EXCLUDED.onboarding_status,
         onboarding_completed_at = EXCLUDED.onboarding_completed_at, tier = EXCLUDED.tier,
         last_login_at = EXCLUDED.last_login_at
       RETURNING id`,
      [id, `demo.customer.${String(number).padStart(2, '0')}@purposemint.local`, passwordHash,
        firstNames[index], lastNames[index], status, completed ? 'completed' : index % 2 ? 'in_progress' : 'not_started', tier, createdDaysAgo],
    );
    const userId = userResult.rows[0].id;

    if (completed) {
      const pathway = pathways[index % pathways.length].key;
      const applicationId = uuid('8100', number);
      const submitted = index % 4 !== 0;
      await client.query(
        `INSERT INTO pathway_applications (
           id, user_id, pathway_key, attested_amount, attestation_accepted_at,
           verification_method, status, submitted_at, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, now() - interval '2 days', 'self_attested', $5::pathway_applications_status_enum,
           CASE WHEN $5::pathway_applications_status_enum = 'submitted' THEN now() - interval '1 day' ELSE NULL END,
           now() - interval '3 days', now())
         ON CONFLICT (id) DO UPDATE SET pathway_key = EXCLUDED.pathway_key,
           attested_amount = EXCLUDED.attested_amount, status = EXCLUDED.status,
           submitted_at = EXCLUDED.submitted_at`,
        [applicationId, userId, pathway, 900 + index * 175, submitted ? 'submitted' : 'draft'],
      );
      await client.query(
        `INSERT INTO pathway_checklist_items (application_id, checklist_template_id, is_complete, completed_at)
         SELECT $1, template.id, template.sort_order <= $2,
           CASE WHEN template.sort_order <= $2 THEN now() - interval '12 hours' ELSE NULL END
         FROM checklist_templates template WHERE template.pathway_key = $3
         ON CONFLICT (application_id, checklist_template_id) DO UPDATE SET
           is_complete = EXCLUDED.is_complete, completed_at = EXCLUDED.completed_at`,
        [applicationId, index % 8, pathway],
      );
      await client.query(
        `INSERT INTO pathway_application_partners (application_id, partner_id)
         SELECT $1, partner.id FROM partners partner
         WHERE partner.pathway_key = $2 ORDER BY partner.sort_order LIMIT 1
         ON CONFLICT (application_id, partner_id) DO NOTHING`,
        [applicationId, pathway],
      );
    }

    if (index % 3 === 1) {
      const planKey = index % 2 ? 'growth' : 'elevate';
      await client.query(
        `INSERT INTO upgrade_intents (id, user_id, plan_key, created_at)
         VALUES ($1, $2, $3, now() - ($4 * interval '1 day'))
         ON CONFLICT (user_id, plan_key) DO NOTHING`,
        [uuid('8200', number), userId, planKey, index + 1],
      );
    }
  }
  await client.query('COMMIT');
  console.log(`Mock development data ready: ${firstNames.length} customer records.`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
