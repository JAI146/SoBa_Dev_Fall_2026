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
// Intentional demo distribution, bottom-heavy for the five-level chart.
// These are presentation fixtures, not outcomes calculated from savings or habits.
const mockLevels = [1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 5];

function uuid(group, index) {
  return `00000000-0000-4000-${group}-${String(index).padStart(12, '0')}`;
}

await client.connect();
try {
  await client.query('BEGIN');
  const passwordHash = await bcrypt.hash('Customer123!', 10);
  const pathways = (await client.query('SELECT key FROM pathways ORDER BY sort_order')).rows;
  const values = (await client.query('SELECT id, key FROM "values" ORDER BY sort_order')).rows;
  const goalTemplates = (await client.query('SELECT id, title, target_amount, is_pathway_eligible, icon_emoji FROM goal_templates ORDER BY sort_order')).rows;
  const habitTemplates = (await client.query('SELECT id, frequency FROM habit_templates ORDER BY sort_order')).rows;
  const challenges = (await client.query('SELECT id FROM community_challenges ORDER BY active_month')).rows;
  if (!pathways.length) throw new Error('Reference data is missing; start the API before running the mock seed.');
  if (values.length < 2 || goalTemplates.length < 2 || habitTemplates.length < 2 || !challenges.length) {
    throw new Error('Onboarding and challenge catalogs are missing; start the API before running the mock seed.');
  }

  let completedIndex = 0;

  for (let index = 0; index < firstNames.length; index += 1) {
    const number = index + 1;
    const id = uuid('8000', number);
    const completed = index % 5 !== 0;
    const mockLevel = completed ? mockLevels[completedIndex++] : null;
    const status = index % 11 === 0 ? 'suspended' : index % 7 === 0 ? 'pending_email' : 'active';
    const tier = index % 6 === 0 ? 'elevate' : index % 3 === 0 ? 'growth' : 'free';
    const createdDaysAgo = 2 + index * 3;
    const userResult = await client.query(
      `INSERT INTO users (
         id, email, password_hash, first_name, last_name, display_name, country,
         state, city, time_zone, user_type, status, email_verified_at,
         onboarding_status, onboarding_completed_at, tier, notification_preferences,
         policy_agreements, last_login_at, created_at, updated_at,
         current_level, current_level_source, current_level_assigned_at
       ) VALUES (
         $1, $2, $3, $4, $5, $4, 'United States', 'Louisiana', 'Baton Rouge',
         'America/Chicago', 'customer', $6::users_status_enum,
         CASE WHEN $6::users_status_enum = 'pending_email' THEN NULL ELSE now() - ($9::int * interval '1 day') END,
         $7::users_onboarding_status_enum,
         CASE WHEN $7::users_onboarding_status_enum = 'completed' THEN now() - (($9::int - 1) * interval '1 day') ELSE NULL END,
         $8::users_tier_enum, '{"email":true,"push":true}'::jsonb, '{}'::jsonb,
         now() - (($9::int % 20) * interval '1 day'), now() - ($9::int * interval '1 day'), now(),
         $10::smallint, CASE WHEN $10::smallint IS NULL THEN NULL ELSE 'mock' END,
         CASE WHEN $10::smallint IS NULL THEN NULL ELSE now() - (($9::int - 1) * interval '1 day') END
       ) ON CONFLICT (email) DO UPDATE SET
         status = EXCLUDED.status, onboarding_status = EXCLUDED.onboarding_status,
         onboarding_completed_at = EXCLUDED.onboarding_completed_at, tier = EXCLUDED.tier,
         last_login_at = EXCLUDED.last_login_at,
         current_level = CASE WHEN users.current_level_source IS NULL OR users.current_level_source = 'mock'
           THEN EXCLUDED.current_level ELSE users.current_level END,
         current_level_source = CASE WHEN users.current_level_source IS NULL OR users.current_level_source = 'mock'
           THEN EXCLUDED.current_level_source ELSE users.current_level_source END,
         current_level_assigned_at = CASE WHEN users.current_level_source IS NULL OR users.current_level_source = 'mock'
           THEN CASE WHEN users.current_level = EXCLUDED.current_level
             THEN users.current_level_assigned_at ELSE EXCLUDED.current_level_assigned_at END
           ELSE users.current_level_assigned_at END
       RETURNING id`,
      [id, `demo.customer.${String(number).padStart(2, '0')}@purposemint.local`, passwordHash,
        firstNames[index], lastNames[index], status, completed ? 'completed' : index % 2 ? 'in_progress' : 'not_started', tier, createdDaysAgo, mockLevel],
    );
    const userId = userResult.rows[0].id;

    // The operational dashboard needs real relationships, not just catalog rows.
    // Keep a few incomplete accounts empty to exercise empty and onboarding states.
    if (completed || index % 5 === 0) {
      for (const valueIndex of [index % values.length, (index + 2) % values.length]) {
        await client.query(
          `INSERT INTO user_values (user_id, value_id)
           VALUES ($1, $2) ON CONFLICT (user_id, value_id) DO NOTHING`,
          [userId, values[valueIndex].id],
        );
      }
    }

    if (completed) {
      const goalCount = index % 6 === 0 ? 1 : 2;
      for (let goalIndex = 0; goalIndex < goalCount; goalIndex += 1) {
        const template = goalTemplates[(index + goalIndex) % goalTemplates.length];
        const goalId = uuid(goalIndex === 0 ? '8300' : '8301', number);
        const active = goalIndex === 0 || index % 4 !== 1;
        await client.query(
          `INSERT INTO user_goals (id, user_id, title, target_amount, saved_amount,
             source_template_id, is_active, is_focus, is_pathway_eligible,
             icon_emoji, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, $9,
             now() - ($10::int * interval '1 day'), now())
           ON CONFLICT (id) DO NOTHING`,
          [goalId, userId, template.title, template.target_amount, template.id,
            active, goalIndex === 0, template.is_pathway_eligible,
            template.icon_emoji, 30 + index],
        );

        // Some goals have no activity, some are partial, and some reach target.
        const entryCount = index % 5 === 1 && goalIndex === 1 ? 0 : 1 + (index % 4);
        const targetCents = Math.round(Number(template.target_amount) * 100);
        const totalCents = index % 7 === 2 && goalIndex === 0
          ? targetCents
          : Math.round(targetCents * (0.12 + (index % 5) * 0.12));
        for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
          const baseCents = Math.floor(totalCents / entryCount);
          const amountCents = baseCents + (entryIndex === entryCount - 1
            ? totalCents - baseCents * entryCount : 0);
          await client.query(
            `INSERT INTO savings_entries (id, user_id, user_goal_id, amount, note, created_at)
             VALUES ($1, $2, $3, $4, 'Manual demo savings',
               now() - ($5::int * interval '1 day'))
             ON CONFLICT (id) DO NOTHING`,
            [uuid(goalIndex === 0 ? '8400' : '8401', number * 10 + entryIndex),
              userId, goalId, amountCents / 100, 2 + entryIndex * 7 + goalIndex],
          );
        }
        // Preserve the application's invariant, including if a developer added
        // savings through the API after a previous seed run.
        await client.query(
          `UPDATE user_goals g SET saved_amount = (
             SELECT COALESCE(SUM(amount), 0) FROM savings_entries WHERE user_goal_id = g.id
           ) WHERE g.id = $1`,
          [goalId],
        );
      }

      for (let habitIndex = 0; habitIndex < 3; habitIndex += 1) {
        const template = habitTemplates[(index + habitIndex) % habitTemplates.length];
        const habitId = uuid(`85${habitIndex}0`, number);
        const active = habitIndex !== 2 || index % 3 !== 0;
        await client.query(
          `INSERT INTO user_habits (id, user_id, source_template_id, is_active,
             created_at, updated_at)
           VALUES ($1, $2, $3, $4, now() - interval '30 days', now())
           ON CONFLICT (user_id, source_template_id) DO NOTHING`,
          [habitId, userId, template.id, active],
        );
        const savedHabit = await client.query(
          `SELECT id FROM user_habits WHERE user_id = $1 AND source_template_id = $2`,
          [userId, template.id],
        );
        const savedHabitId = savedHabit.rows[0].id;
        // Gaps are deliberate: the progress UI can distinguish streaks from
        // missed days. Weekly habits use spaced dates; as-needed are sparse.
        const dayOffsets = template.frequency === 'daily'
          ? [0, 1, 2, 4, 5, 8, 9, 10, 14]
          : template.frequency === 'weekly' ? [1, 8, 15, 22] : [2, 13];
        for (const [completionIndex, daysAgo] of dayOffsets.entries()) {
          await client.query(
            `INSERT INTO habit_completions (id, user_id, user_habit_id, completed_on)
             VALUES ($1, $2, $3, (now() AT TIME ZONE 'America/Chicago')::date - $4::int)
             ON CONFLICT DO NOTHING`,
            [uuid(`86${habitIndex}0`, number * 100 + completionIndex),
              userId, savedHabitId, daysAgo + index % 3],
          );
        }
      }

      if (index % 3 === 0) {
        const reflectionId = uuid('8700', number);
        await client.query(
          `INSERT INTO reflections (id, user_id, kind, body, mood_score, reflected_on)
           VALUES ($1, $2, 'text', $3, $4,
             (now() AT TIME ZONE 'America/Chicago')::date - $5::int)
           ON CONFLICT (id) DO NOTHING`,
          [reflectionId, userId, 'I made progress toward my savings goal today.',
            2 + index % 4, index % 8],
        );
        await client.query(
          `INSERT INTO reflection_theme_matches (reflection_id, theme_key)
           VALUES ($1, 'progress') ON CONFLICT DO NOTHING`,
          [reflectionId],
        );
      }

      if (index % 4 === 0) {
        await client.query(
          `INSERT INTO challenge_participations
             (id, user_id, challenge_id, joined_at, completed_at)
           VALUES ($1, $2, $3, now() - interval '7 days',
             CASE WHEN $4::boolean THEN now() - interval '1 day' ELSE NULL END)
           ON CONFLICT (user_id, challenge_id) DO NOTHING`,
          [uuid('8800', number), userId, challenges[index % challenges.length].id,
            index % 8 === 0],
        );
      }
    }

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
