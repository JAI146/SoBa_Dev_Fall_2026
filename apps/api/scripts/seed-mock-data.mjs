import bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
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

// Activity is anchored to each customer's signup so retention looks realistic:
// by index, a customer stays active for their whole tenure or drops off after
// two, three or five weeks. Days count from signup and never pass today.
const ACTIVE_STRETCH_DAYS = [Infinity, 14, 21, 35];

function activeStretch(index, createdDaysAgo) {
  return Math.min(ACTIVE_STRETCH_DAYS[index % ACTIVE_STRETCH_DAYS.length], createdDaysAgo);
}

// Days after signup for `count` events, spread over days 1..stretch and
// thinning out over time. Events move to a free day where one is left.
function spreadDays(count, stretch) {
  const days = [];
  for (let k = 0; k < count; k += 1) {
    const share = count === 1 ? 0 : (k / (count - 1)) ** 1.5;
    let day = 1 + Math.round((stretch - 1) * share);
    while (days.includes(day) && day < stretch) day += 1;
    days.push(day);
  }
  return days;
}

// Catalog positions change when templates are added. Key habit fixture IDs to
// their relationship instead, preserving existing rows through the natural key.
function relationshipUuid(kind, ...parts) {
  const hex = createHash('sha256').update(JSON.stringify(['purposemint-mock', kind, ...parts])).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

await client.connect();
try {
  await client.query('BEGIN');
  const passwordHash = await bcrypt.hash('Customer123!', 10);
  const pathways = (await client.query('SELECT key FROM pathways ORDER BY sort_order')).rows;
  const values = (await client.query('SELECT id, key FROM "values" ORDER BY sort_order')).rows;
  const goalTemplates = (await client.query('SELECT id, title, target_amount, is_pathway_eligible, icon_emoji FROM goal_templates ORDER BY sort_order')).rows;
  const habitTemplates = (await client.query('SELECT id, frequency FROM habit_templates ORDER BY sort_order, id')).rows;
  const challenges = (await client.query('SELECT id FROM community_challenges ORDER BY active_month')).rows;
  if (!pathways.length) throw new Error('Reference data is missing; start the API before running the mock seed.');
  if (values.length < 2 || goalTemplates.length < 2 || habitTemplates.length < 2 || !challenges.length) {
    throw new Error('Onboarding and challenge catalogs are missing; start the API before running the mock seed.');
  }

  let completedIndex = 0;
  const userIds = [];

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
         -- Re-anchor dates to this run so signup and onboarding stay one day apart.
         created_at = EXCLUDED.created_at, email_verified_at = EXCLUDED.email_verified_at,
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
    userIds[index] = userId;
    const stretch = activeStretch(index, createdDaysAgo);

    // Mock users are inserted after migrations run. Import their configured
    // membership once; reruns must preserve any administrator changes/history.
    await client.query(
      `WITH inserted AS (
         INSERT INTO user_subscriptions
           (user_id, plan_key, status, billing, payment_status, started_at, renewal_at, failed_payments, version)
         SELECT u.id, p.key, 'active',
           jsonb_build_object('planKey', p.key, 'planName', p.name, 'planVersion', p.version,
             'cycle', 'monthly', 'currency', 'USD', 'amountCents', round(p.price_monthly * 100)::int,
             'regularAmountCents', round(p.price_monthly * 100)::int, 'promotionEndsAt', NULL),
           CASE WHEN p.price_monthly = 0 THEN 'not_required' ELSE 'pending' END,
           u.created_at, now() + interval '1 month', 0, 1
         FROM users u JOIN subscription_plans p ON p.key = u.tier::text
         WHERE u.id = $1 AND u.user_type = 'customer' AND u.deleted_at IS NULL
         ON CONFLICT (user_id) DO NOTHING RETURNING *
       ), history AS (
         INSERT INTO subscription_history
           (subscription_id, action, new_plan_key, new_billing, effective_at)
         SELECT id, 'legacy_imported', plan_key, billing, started_at FROM inserted
       )
       INSERT INTO audit_events (actor_type, action, entity_type, entity_id, outcome, metadata)
       SELECT 'system', 'admin.subscription_changed', 'subscription', id::text, 'success',
         jsonb_build_object('action', 'legacy_imported', 'source', 'mock_seed', 'newBilling', billing)
       FROM inserted`,
      [userId],
    );

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
           ON CONFLICT (id) DO UPDATE SET created_at = EXCLUDED.created_at`,
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
        const savingsDays = spreadDays(entryCount, stretch);
        for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
          // Several deposits on one day are fine; just never after today.
          const savedOn = Math.min(savingsDays[entryIndex] + goalIndex, createdDaysAgo);
          const baseCents = Math.floor(totalCents / entryCount);
          const amountCents = baseCents + (entryIndex === entryCount - 1
            ? totalCents - baseCents * entryCount : 0);
          await client.query(
            `INSERT INTO savings_entries (id, user_id, user_goal_id, amount, note, created_at)
             VALUES ($1, $2, $3, $4, 'Manual demo savings',
               now() - ($5::int * interval '1 day'))
             ON CONFLICT (id) DO UPDATE SET created_at = EXCLUDED.created_at`,
            [uuid(goalIndex === 0 ? '8400' : '8401', number * 10 + entryIndex),
              userId, goalId, amountCents / 100, createdDaysAgo - savedOn],
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
        const habitId = relationshipUuid('habit', userId, template.id);
        const active = habitIndex !== 2 || index % 3 !== 0;
        await client.query(
          `INSERT INTO user_habits (id, user_id, source_template_id, is_active,
             created_at, updated_at)
           VALUES ($1, $2, $3, $4, now() - ($5::int * interval '1 day'), now())
           ON CONFLICT (user_id, source_template_id) DO UPDATE
             SET created_at = EXCLUDED.created_at
             WHERE user_habits.id = EXCLUDED.id`,
          // Habits start at signup, before their first check-in.
          [habitId, userId, template.id, active, createdDaysAgo],
        );
        const savedHabit = await client.query(
          `SELECT id FROM user_habits WHERE user_id = $1 AND source_template_id = $2`,
          [userId, template.id],
        );
        const savedHabitId = savedHabit.rows[0].id;
        // Gaps are deliberate: the progress UI can distinguish streaks from
        // missed days. Weekly habits use spaced dates; as-needed are sparse.
        // The offsets set how many check-ins each habit gets; their dates are
        // spread from signup across the customer's active stretch.
        const dayOffsets = template.frequency === 'daily'
          ? [0, 1, 2, 4, 5, 8, 9, 10, 14]
          : template.frequency === 'weekly' ? [1, 8, 15, 22] : [2, 13];
        const checkInDays = spreadDays(dayOffsets.length, stretch);
        const completionIds = [...dayOffsets.keys()].map((completionIndex) =>
          relationshipUuid('completion', savedHabitId, completionIndex));
        // Earlier seed runs keyed check-ins by position; park and clear those too
        // so their dates are free for the rows above.
        const seededIds = completionIds.concat([...dayOffsets.keys()].map(
          (completionIndex) => uuid(`86${habitIndex}0`, number * 100 + completionIndex)));
        // A habit allows one check-in a day, so park this habit's seeded
        // check-ins on placeholder dates before giving them their new ones.
        await client.query(
          `UPDATE habit_completions
           SET completed_on = DATE '1900-01-01' + array_position($1::uuid[], id)
           WHERE id = ANY($1::uuid[])`,
          [seededIds],
        );
        const usedDays = new Set();
        for (const completionIndex of dayOffsets.keys()) {
          // A customer newer than the habit's check-in count runs out of days;
          // the extra check-ins are left out rather than doubled up.
          if (usedDays.has(checkInDays[completionIndex])) continue;
          usedDays.add(checkInDays[completionIndex]);
          await client.query(
            `INSERT INTO habit_completions (id, user_id, user_habit_id, completed_on)
             VALUES ($1, $2, $3, (now() AT TIME ZONE 'America/Chicago')::date - $4::int)
             ON CONFLICT (id) DO UPDATE SET completed_on = EXCLUDED.completed_on`,
            [completionIds[completionIndex],
              userId, savedHabitId, createdDaysAgo - checkInDays[completionIndex]],
          );
        }
        // Seeded check-ins still on a placeholder date had no day left.
        await client.query(
          `DELETE FROM habit_completions
           WHERE id = ANY($1::uuid[]) AND completed_on < DATE '1901-01-01'`,
          [seededIds],
        );
      }

      if (index % 3 === 0) {
        const reflectionId = uuid('8700', number);
        await client.query(
          `INSERT INTO reflections (id, user_id, kind, body, mood_score, reflected_on)
           VALUES ($1, $2, 'text', $3, $4,
             (now() AT TIME ZONE 'America/Chicago')::date - $5::int)
           ON CONFLICT (id) DO UPDATE SET reflected_on = EXCLUDED.reflected_on`,
          [reflectionId, userId, 'I made progress toward my savings goal today.',
            // Halfway through the customer's active stretch.
            2 + index % 4, createdDaysAgo - Math.max(1, Math.round(stretch / 2))],
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
           ON CONFLICT (user_id, challenge_id) DO UPDATE
             SET joined_at = EXCLUDED.joined_at, completed_at = EXCLUDED.completed_at
             WHERE challenge_participations.id = EXCLUDED.id`,
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
           submitted_at = EXCLUDED.submitted_at, created_at = EXCLUDED.created_at,
           attestation_accepted_at = EXCLUDED.attestation_accepted_at`,
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
         ON CONFLICT (user_id, plan_key) DO UPDATE SET created_at = EXCLUDED.created_at
           WHERE upgrade_intents.id = EXCLUDED.id`,
        [uuid('8200', number), userId, planKey, index + 1],
      );
    }

    // Cycle through every verification state, including stuck and escalated cases.
    const kycCase = [
      null,
      ['in_progress', 1, null, null, 1],
      ['verified', 2, null, null, 12],
      ['failed', 1, 'document_unreadable', 'The submitted ID image could not be read.', 2],
      ['requires_action', 2, 'address_mismatch', 'The address does not match the document provided.', 6],
      ['under_review', 1, null, null, 5],
      ['in_progress', 1, null, null, 8],
      ['verified', 1, null, null, 20],
    ][index % 8];
    if (kycCase) {
      const [kycStatus, attempts, failureCode, failureReason, daysAgo] = kycCase;
      await client.query(
        `INSERT INTO kyc_verifications (
           user_id, status, provider, attempt_count, failure_code, failure_reason,
           status_changed_at, updated_at
         ) VALUES ($1, $2, 'manual', $3, $4, $5, now() - ($6 * interval '1 day'), now())
         ON CONFLICT (user_id) DO UPDATE SET
           status = EXCLUDED.status, attempt_count = EXCLUDED.attempt_count,
           failure_code = EXCLUDED.failure_code, failure_reason = EXCLUDED.failure_reason,
           status_changed_at = EXCLUDED.status_changed_at, updated_at = now()`,
        [userId, kycStatus, attempts, failureCode, failureReason, daysAgo],
      );
    }
  }
  // Commercial events for subscription analytics. History and billing rows are
  // append-only, so each event is keyed by a fixed id, applied to the
  // subscription only when its journal row is new, and keeps its first date.
  const admin = (await client.query(
    `SELECT id FROM users WHERE user_type = 'admin' AND deleted_at IS NULL
     ORDER BY created_at LIMIT 1`,
  )).rows[0]?.id ?? null;
  const commercialAudit = `INSERT INTO audit_events
      (actor_type, action, entity_type, entity_id, outcome, metadata)
    SELECT 'system', 'admin.subscription_changed', 'subscription',
      subscription_id::text, 'success',
      jsonb_build_object('action', action, 'source', 'mock_seed')
    FROM event`;

  // Free to paid upgrades, each a few days after the customer's upgrade intent.
  for (const [index, planKey, daysAgo] of [[1, 'growth', 1], [4, 'elevate', 3], [7, 'growth', 6]]) {
    await client.query(
      `WITH sub AS (
         SELECT id, plan_key, billing FROM user_subscriptions
         WHERE user_id = $1 AND status <> 'cancelled' FOR UPDATE
       ), plan AS (
         SELECT key, name, version, round(price_monthly * 100)::int AS cents
         FROM subscription_plans WHERE key = $2
       ), event AS (
         INSERT INTO subscription_history (id, subscription_id, action,
           previous_plan_key, new_plan_key, previous_billing, new_billing,
           effective_at, authorized_by)
         SELECT $3, sub.id, 'upgraded', sub.plan_key, plan.key, sub.billing,
           jsonb_build_object('planKey', plan.key, 'planName', plan.name,
             'planVersion', plan.version, 'cycle', 'monthly', 'currency', 'USD',
             'amountCents', plan.cents, 'regularAmountCents', plan.cents,
             'promotionEndsAt', NULL),
           now() - ($4::numeric * interval '1 day'), $5
         FROM sub, plan
         ON CONFLICT (id) DO NOTHING RETURNING *
       ), audit AS (${commercialAudit})
       UPDATE user_subscriptions s SET plan_key = event.new_plan_key,
         billing = event.new_billing, status = 'active', payment_status = 'pending',
         cancelled_at = NULL, renewal_at = event.effective_at + interval '1 month',
         version = s.version + 1
       FROM event WHERE s.id = event.subscription_id`,
      [userIds[index], planKey, uuid('8900', index + 1), daysAgo, admin],
    );
  }

  // Immediate cancellations of two paid plans.
  for (const [index, daysAgo] of [[15, 20], [18, 50]]) {
    await client.query(
      `WITH sub AS (
         SELECT id, plan_key, billing FROM user_subscriptions
         WHERE user_id = $1 AND status <> 'cancelled' FOR UPDATE
       ), event AS (
         INSERT INTO subscription_history (id, subscription_id, action,
           previous_plan_key, previous_billing, effective_at, authorized_by)
         SELECT $2, sub.id, 'cancelled', sub.plan_key, sub.billing,
           now() - ($3::numeric * interval '1 day'), $4
         FROM sub
         ON CONFLICT (id) DO NOTHING RETURNING *
       ), audit AS (${commercialAudit})
       UPDATE user_subscriptions s SET status = 'cancelled',
         cancelled_at = event.effective_at, version = s.version + 1
       FROM event WHERE s.id = event.subscription_id`,
      [userIds[index], uuid('8910', index + 1), daysAgo, admin],
    );
  }

  if (admin) {
    // One cancellation scheduled for the next renewal.
    await client.query(
      `WITH sub AS (
         SELECT id, plan_key, billing, renewal_at FROM user_subscriptions
         WHERE user_id = $1 AND status <> 'cancelled' AND pending_change IS NULL
         FOR UPDATE
       ), event AS (
         INSERT INTO subscription_history (id, subscription_id, action,
           previous_plan_key, previous_billing, effective_at, authorized_by,
           recorded_at)
         SELECT $2, sub.id, 'cancellation_scheduled', sub.plan_key, sub.billing,
           GREATEST(sub.renewal_at, now() + interval '7 days'), $3::uuid,
           now() - interval '4 days'
         FROM sub
         ON CONFLICT (id) DO NOTHING RETURNING *
       ), audit AS (${commercialAudit})
       UPDATE user_subscriptions s SET pending_change = jsonb_build_object(
           'action', 'cancel',
           'effectiveAt', to_char(event.effective_at AT TIME ZONE 'UTC',
             'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
           'authorizedBy', $3::text, 'terms', NULL),
         version = s.version + 1
       FROM event WHERE s.id = event.subscription_id`,
      [userIds[12], uuid('8920', 13), admin],
    );

    // Billing outcomes: one paid renewal and two failures that leave the
    // subscriptions past due. Records need an authorising staff member.
    for (const [index, status, daysAgo] of [[1, 'paid', 0.5], [3, 'failed', 2], [6, 'failed', 12]]) {
      await client.query(
        `WITH sub AS (
           SELECT id, billing, renewal_at FROM user_subscriptions
           WHERE user_id = $1 AND status <> 'cancelled'
             AND (billing->>'amountCents')::int > 0
           FOR UPDATE
         ), record AS (
           INSERT INTO subscription_billing_records (id, subscription_id, status,
             amount_cents, billing, period_ends_at, occurred_at, reference, note,
             authorized_by)
           SELECT $2::uuid, sub.id, $3, (sub.billing->>'amountCents')::int, sub.billing,
             sub.renewal_at, now() - ($4::numeric * interval '1 day'),
             'mock-seed-' || $2::text, 'Demo payment from the mock seed', $5
           FROM sub
           ON CONFLICT DO NOTHING RETURNING *
         )
         UPDATE user_subscriptions s SET payment_status = record.status,
           status = CASE WHEN record.status = 'failed' THEN 'past_due' ELSE 'active' END,
           failed_payments = s.failed_payments + (record.status = 'failed')::int,
           version = s.version + 1
         FROM record WHERE s.id = record.subscription_id`,
        [userIds[index], uuid('8930', index + 1), status, daysAgo, admin],
      );
    }
  } else {
    console.warn('No admin account found; skipped the scheduled cancellation and billing records.');
  }

  await client.query('COMMIT');
  console.log(`Mock development data ready: ${firstNames.length} customer records.`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
