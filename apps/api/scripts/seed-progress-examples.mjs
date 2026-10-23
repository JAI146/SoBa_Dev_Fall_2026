// Optional local fixtures. Separate from the team's existing seed, and insert-only.
import { Client } from 'pg';

if (process.env.NODE_ENV === 'production')
  throw new Error('Development examples cannot run in production.');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const client = new Client({ connectionString: process.env.DATABASE_URL });
const id = (group, index) =>
  `00000000-0000-4000-${group}-${String(index).padStart(12, '0')}`;
const now = new Date();
const parts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).formatToParts(now);
const today = `${parts.find((p) => p.type === 'year').value}-${parts.find((p) => p.type === 'month').value}-${parts.find((p) => p.type === 'day').value}`;
const day = (offset) =>
  offset === 0
    ? now
    : new Date(Date.parse(`${today}T12:00:00Z`) + offset * 86400000);

async function audit(
  index,
  action,
  entityType,
  entityId,
  metadata,
  occurredAt,
  userId,
) {
  await client.query(
    `INSERT INTO audit_events (id, actor_user_id, actor_type, action, entity_type, entity_id, outcome, metadata, created_at)
    VALUES ($1, $2, 'system', $3, $4, $5, 'success', $6::jsonb, $7) ON CONFLICT (id) DO NOTHING`,
    [
      id('8f30', index),
      userId,
      action,
      entityType,
      entityId,
      JSON.stringify({ userId, source: 'demo', ...metadata }),
      occurredAt,
    ],
  );
}

await client.connect();
try {
  await client.query('BEGIN');
  const customer = (
    await client.query(
      `SELECT id FROM users WHERE email = 'demo.customer.02@purposemint.local' AND user_type = 'customer'`,
    )
  ).rows[0];
  if (!customer)
    throw new Error(
      'Run seed:mock first; Jordan is required for these local examples.',
    );
  const userId = customer.id;
  const examples = [
    {
      title: 'Demo · paused money journal',
      frequency: 'daily',
      start: -7,
      completions: [-6, -5],
      pause: -3,
    },
    {
      title: 'Demo · recovering savings check-in',
      frequency: 'daily',
      start: -7,
      completions: [-5, 0],
    },
    {
      title: 'Demo · completed budget check',
      frequency: 'daily',
      start: -3,
      completions: [-2, -1, 0],
    },
    {
      title: 'Demo · missed spending check',
      frequency: 'daily',
      start: -7,
      completions: [-5],
    },
    {
      title: 'Demo · new active habit',
      frequency: 'daily',
      start: 0,
      completions: [],
    },
    {
      title: 'Demo · weekly savings review',
      frequency: 'weekly',
      start: -28,
      completions: [-22, -15, -8],
    },
    {
      title: 'Demo · as-needed reflection',
      frequency: 'as_needed',
      start: -7,
      completions: [-3],
    },
    {
      title: 'Demo · deselected habit',
      frequency: 'daily',
      start: -7,
      completions: [-6],
      inactive: true,
    },
  ];
  for (const [index, example] of examples.entries()) {
    const templateId = id('8f10', index + 1),
      habitId = id('8f20', index + 1);
    await client.query(
      `INSERT INTO habit_templates (id, title, description, frequency, category, icon_emoji, sort_order)
      VALUES ($1, $2, 'Local behavioral-progress example', $3, 'money', '✓', $4) ON CONFLICT (id) DO NOTHING`,
      [templateId, example.title, example.frequency, 900 + index],
    );
    const inserted = await client.query(
      `INSERT INTO user_habits (id, user_id, source_template_id, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $5) ON CONFLICT DO NOTHING RETURNING id`,
      [habitId, userId, templateId, !example.inactive, day(example.start)],
    );
    if (!inserted.rowCount) continue; // Preserve later developer changes and avoid moving fixture dates.
    await audit(
      index * 10 + 1,
      'habit.selection_changed',
      'habit',
      habitId,
      { previousActive: null, active: true },
      day(example.start),
      userId,
    );
    if (example.pause !== undefined)
      await audit(
        index * 10 + 2,
        'habit.paused',
        'habit',
        habitId,
        { paused: true },
        day(example.pause),
        userId,
      );
    if (example.inactive)
      await audit(
        index * 10 + 3,
        'habit.selection_changed',
        'habit',
        habitId,
        { previousActive: true, active: false },
        day(-2),
        userId,
      );
    for (const [completionIndex, offset] of example.completions.entries()) {
      await client.query(
        `INSERT INTO habit_completions (id, user_id, user_habit_id, completed_on, created_at)
        VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
        [
          id('8f40', index * 10 + completionIndex + 1),
          userId,
          habitId,
          day(offset).toISOString().slice(0, 10),
          day(offset),
        ],
      );
    }
  }
  const goalId = id('8f50', 1);
  const insertedGoal = await client.query(
    `INSERT INTO user_goals (id, user_id, title, target_amount, saved_amount, is_active, is_focus, is_pathway_eligible, icon_emoji, created_at, updated_at)
    VALUES ($1, $2, 'Demo emergency cushion', 500, 50, true, false, false, '🎯', $3, $4) ON CONFLICT DO NOTHING RETURNING id`,
    [goalId, userId, day(-3), day(-1)],
  );
  if (insertedGoal.rowCount) {
    await client.query(
      `INSERT INTO savings_entries (id, user_id, user_goal_id, amount, note, created_at)
      VALUES ($1, $2, $3, 50, 'Local goal-history example', $4) ON CONFLICT DO NOTHING`,
      [id('8f60', 1), userId, goalId, day(-1)],
    );
    const before = {
      title: 'Demo emergency cushion',
      targetAmount: 500,
      savedAmount: 0,
      isActive: true,
      isFocus: false,
    };
    await audit(
      1001,
      'goal.changed',
      'goal',
      goalId,
      { previous: null, current: before },
      day(-3),
      userId,
    );
    await audit(
      1002,
      'goal.changed',
      'goal',
      goalId,
      { previous: before, current: { ...before, savedAmount: 50 } },
      day(-1),
      userId,
    );
  }
  // A separate longer-running goal demonstrates weekly/monthly contribution gaps.
  const timelineGoalId = id('8f50', 2);
  const timelineInserted = await client.query(
    `INSERT INTO user_goals (id, user_id, title, target_amount, saved_amount, is_active, is_focus, is_pathway_eligible, icon_emoji, created_at, updated_at)
    VALUES ($1,$2,'Demo savings consistency timeline',2000,600,true,false,false,'🎯',$3,$4) ON CONFLICT DO NOTHING RETURNING id`,
    [timelineGoalId, userId, day(-100), day(-3)],
  );
  if (timelineInserted.rowCount) {
    for (const [index, [offset, amount]] of [
      [-90, 100],
      [-61, 150],
      [-22, 200],
      [-3, 150],
    ].entries()) {
      await client.query(
        `INSERT INTO savings_entries (id,user_id,user_goal_id,amount,note,created_at) VALUES ($1,$2,$3,$4,'Local consistency example',$5) ON CONFLICT DO NOTHING`,
        [id('8f60', index + 2), userId, timelineGoalId, amount, day(offset)],
      );
    }
    const state = {
      title: 'Demo savings consistency timeline',
      targetAmount: 2000,
      savedAmount: 600,
      isActive: true,
      isFocus: false,
    };
    await audit(
      1003,
      'goal.changed',
      'goal',
      timelineGoalId,
      { previous: null, current: { ...state, savedAmount: 0 } },
      day(-100),
      userId,
    );
    await audit(
      1004,
      'goal.changed',
      'goal',
      timelineGoalId,
      { previous: { ...state, savedAmount: 450 }, current: state },
      day(-3),
      userId,
    );
  }
  await client.query('COMMIT');
  console.log(
    'Optional progress examples ready for Jordan. Existing records preserved.',
  );
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
