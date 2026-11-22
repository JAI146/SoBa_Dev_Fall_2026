import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  type AdminSubscription,
  type SavingsProgressDataResponse,
  type BadgeAwardRecord,
  type ManagedApplication,
  adminSubscriptionsResponseSchema,
  badgeAwardsResponseSchema,
  pathwayManagementResponseSchema,
  savingsProgressDataResponseSchema,
} from '@purposemint/contracts';
import type { ReadResource } from './assistant-tools.catalog';
import type { ChartDataset } from './assistant-chart';
import { redactAssistantText } from './assistant-tool-output';

export const customerFields = {
  customerName: 'Customer name, with duplicate names distinguished',
  progressPercent:
    'Current saved amount divided by target, as a percentage; unknown without a target',
  savedAmount: 'Total current self-reported savings in USD',
  targetAmount: 'Total current savings target in USD',
  remainingAmount: 'Remaining savings target in USD',
  goalCount: 'Number of savings goals',
  pathwayEligible: 'Has a goal marked pathway eligible',
  noSavingsActivity:
    'True when no savings contribution entries have been recorded',
  plan: 'Current subscription record plan name, including cancelled subscriptions unless filtered',
  subscriptionStatus: 'Status on the subscription record',
  subscriptionStartedAt:
    'UTC subscription start date and time, supports ISO date comparisons',
  badgeCount: 'Number of distinct badges earned',
  badgeStatus: 'With badges or No badges',
  badge:
    'Distinct earned badge names or No badges; a customer may appear in multiple groups',
  hasPathway: 'Has any draft or submitted application',
  pathway:
    'Distinct applied-to pathway titles (includes drafts), or No pathway; groups can overlap',
  submittedPathway:
    'Distinct pathway titles with a submitted application or No submitted pathway; groups can overlap',
};
type Savings = SavingsProgressDataResponse['customers']['items'][number];
type Read = (endpoint: ReadResource) => Promise<unknown>;
type Page<T> = { items: T[]; page: number; total: number; pageSize: number };

// Complete, bounded populations only. Reject page drift rather than calculating on an incomplete join.
async function allPages<T extends { id: string }>(
  load: (page: number) => Promise<Page<T>>,
) {
  const rows: T[] = [];
  const ids = new Set<string>();
  let total: number | undefined;
  for (let page = 1; ; page++) {
    const batch = await load(page);
    if (batch.total > 2500)
      throw new BadRequestException(
        'Customer comparison supports up to 2,500 source records per paged report.',
      );
    total ??= batch.total;
    if (
      batch.total !== total ||
      batch.page !== page ||
      batch.pageSize !== 50 ||
      batch.items.length !== Math.min(50, total - rows.length)
    )
      throw new ConflictException(
        'Report pages changed during analysis. Retry the comparison.',
      );
    for (const row of batch.items) {
      if (ids.has(row.id))
        throw new ConflictException(
          'A record moved between report pages. Retry the comparison.',
        );
      ids.add(row.id);
      rows.push(row);
    }
    if (rows.length === total) return rows;
  }
}

function addMembership(
  index: Map<string, Set<string>>,
  owner: string,
  value: string,
) {
  const values = index.get(owner) ?? new Set<string>();
  values.add(value);
  index.set(owner, values);
}

export async function loadCustomerDataset(
  read: Read,
  requested: Set<string>,
): Promise<ChartDataset> {
  for (const field of requested)
    if (!Object.hasOwn(customerFields, field))
      throw new BadRequestException(
        'Unknown customer analysis field: ' + field.slice(0, 100),
      );
  const savings = await allPages<Savings>(async (page) => {
    const result = (await read({
      key: 'savings',
      path: 'admin/assistant-data/savings-progress',
      schema: savingsProgressDataResponseSchema,
      query: {
        page,
        pageSize: 50,
        ...(requested.has('noSavingsActivity') && { includeEntryCounts: true }),
      },
    })) as SavingsProgressDataResponse;
    return { items: result.customers.items, ...result.customers.pagination };
  });
  const subscriptions = new Map<string, AdminSubscription>();
  if (
    ['plan', 'subscriptionStatus', 'subscriptionStartedAt'].some((k) =>
      requested.has(k),
    )
  ) {
    const records = await allPages<AdminSubscription>(
      async (page) =>
        (await read({
          key: 'subscriptions',
          path: 'admin/subscription-management/subscriptions',
          schema: adminSubscriptionsResponseSchema,
          query: { page, pageSize: 50 },
        })) as Page<AdminSubscription>,
    );
    for (const sub of records) {
      if (subscriptions.has(sub.userId))
        throw new ConflictException(
          'Multiple subscription records match a customer. A current plan cannot be determined reliably.',
        );
      subscriptions.set(sub.userId, sub);
    }
  }
  const badges = new Map<string, Set<string>>();
  const badgeNames = new Map<string, Set<string>>();
  if (['badge', 'badgeStatus', 'badgeCount'].some((k) => requested.has(k))) {
    const result = (await read({
      key: 'awards',
      path: 'admin/badges/awards',
      schema: badgeAwardsResponseSchema,
      query: {},
    })) as { items: BadgeAwardRecord[] };
    for (const award of result.items) {
      addMembership(badges, award.userId, award.badgeId);
      if (requested.has('badge'))
        addMembership(badgeNames, award.userId, award.badgeName);
    }
  }
  const pathways = new Map<string, Set<string>>();
  const submitted = new Map<string, Set<string>>();
  if (
    ['pathway', 'hasPathway', 'submittedPathway'].some((k) => requested.has(k))
  ) {
    const result = (await read({
      key: 'workspace',
      path: 'admin/pathway-management',
      schema: pathwayManagementResponseSchema,
      query: {},
    })) as { applications: ManagedApplication[] };
    for (const app of result.applications) {
      addMembership(pathways, app.applicant.id, app.pathway.title);
      if (app.status === 'submitted')
        addMembership(submitted, app.applicant.id, app.pathway.title);
    }
  }
  const names = new Set<string>();
  const rows = savings.map((s) => {
    const baseName = redactAssistantText(s.name).slice(0, 140);
    let name = baseName,
      occurrence = 1;
    while (names.has(name)) name = baseName + ' (' + ++occurrence + ')';
    names.add(name);
    const subs = subscriptions.get(s.id);
    const membership = pathways.get(s.id);
    const badgeCount = badges.get(s.id)?.size ?? 0;
    const values = {
      customerName: name,
      progressPercent: s.progressPercent,
      savedAmount: s.savedAmount,
      targetAmount: s.targetAmount,
      remainingAmount: s.remainingAmount,
      goalCount: s.goalCount,
      pathwayEligible: s.pathwayEligible,
      noSavingsActivity:
        s.recordedEntryCount === undefined ? null : s.recordedEntryCount === 0,
      plan: subs?.planName ?? null,
      subscriptionStatus: subs?.status ?? null,
      subscriptionStartedAt: subs?.startedAt ?? null,
      badgeCount,
      badgeStatus: badgeCount ? 'With badges' : 'No badges',
      badge: [...(badgeNames.get(s.id) ?? ['No badges'])],
      hasPathway: Boolean(membership?.size),
      pathway: membership ? [...membership] : ['No pathway'],
      submittedPathway: [...(submitted.get(s.id) ?? ['No submitted pathway'])],
    };
    return Object.fromEntries(
      Object.entries(values)
        .filter(([key]) => requested.has(key))
        .map(([key, value]) => [
          key,
          typeof value === 'string'
            ? redactAssistantText(value)
            : Array.isArray(value)
              ? value.map(redactAssistantText)
              : value,
        ]),
    );
  });
  const metrics = [
    'progressPercent',
    'savedAmount',
    'targetAmount',
    'remainingAmount',
    'goalCount',
    'badgeCount',
  ].filter((k) => requested.has(k));
  return {
    rows,
    metrics,
    categories: [...requested].filter((k) => !metrics.includes(k)),
    scope:
      'All visible customers in the savings report. Balances are current, self-reported USD. Missing progress is excluded from averages. Each customer counts once per group.' +
      (requested.has('pathway') || requested.has('hasPathway')
        ? ' Pathways include draft and submitted applications. A customer can appear in multiple pathway groups.'
        : ''),
  };
}
