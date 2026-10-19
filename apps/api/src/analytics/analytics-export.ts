/**
 * Turns each analytics response into CSV rows: one aggregate figure per row,
 * using the same values and rounding the dashboard page shows. No row ever
 * carries a customer's name, email or ID.
 */
import type {
  AdminCommercialAnalyticsResponse,
  AdminPathwayAnalyticsResponse,
  AdminRetentionResponse,
  AdminUserAnalyticsResponse,
  AdminWellnessAnalyticsResponse,
  AnalyticsExportCell,
} from '@purposemint/contracts';

type Row = AnalyticsExportCell[];

const row = (
  section: string,
  metric: string,
  breakdown: string | null,
  value: AnalyticsExportCell,
  unit: string,
): Row => [section, metric, breakdown, value, unit];

/** Whole-number share, as the pages round funnel and lapsed percentages. */
const wholePercent = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((part / whole) * 100);

/** One decimal, as the retention page rounds its week 1 figure. */
const decimalPercent = (part: number, whole: number) =>
  Number(((part / whole) * 100).toFixed(1));

const week = (weekStart: string) => `Week of ${weekStart}`;

export function userAnalyticsRows(data: AdminUserAnalyticsResponse): Row[] {
  const { acquisition, activation, dropOff, windowDays } = data;
  const registered = dropOff.funnel[0]?.count ?? 0;
  return [
    row(
      'Key metrics',
      'Total customers',
      null,
      acquisition.totalCustomers,
      'customers',
    ),
    row(
      'Key metrics',
      'New customers',
      `Last ${windowDays} days`,
      acquisition.newCustomers,
      'customers',
    ),
    row(
      'Key metrics',
      'New customers',
      `Previous ${windowDays} days`,
      acquisition.previousPeriodNewCustomers,
      'customers',
    ),
    row(
      'Key metrics',
      'Email verified',
      null,
      acquisition.emailVerifiedRate,
      'percent',
    ),
    row(
      'Key metrics',
      'Activation rate',
      null,
      activation.activationRate,
      'percent',
    ),
    ...acquisition.weekly.map((item) =>
      row(
        'Acquisition',
        'Signups per week',
        week(item.weekStart),
        item.count,
        'customers',
      ),
    ),
    ...acquisition.byStatus.map((item) =>
      row('Acquisition', 'Account status', item.label, item.count, 'customers'),
    ),
    row('Activation', 'Cohort size', null, activation.cohortSize, 'customers'),
    row(
      'Activation',
      'Activated customers',
      null,
      activation.activated,
      'customers',
    ),
    row(
      'Activation',
      'Median days to finish onboarding',
      null,
      activation.medianDaysToOnboarding,
      'days',
    ),
    ...activation.milestones.map((item) =>
      row('Activation', 'First actions', item.label, item.count, 'customers'),
    ),
    ...dropOff.funnel.flatMap((item) => [
      row('Drop off', 'Signup funnel', item.label, item.count, 'customers'),
      row(
        'Drop off',
        'Signup funnel share of registered',
        item.label,
        wholePercent(item.count, registered),
        'percent',
      ),
    ]),
    ...dropOff.onboardingStatus.map((item) =>
      row('Drop off', 'Onboarding status', item.label, item.count, 'customers'),
    ),
    row(
      'Drop off',
      'Onboarded customers',
      null,
      dropOff.lapsed.onboardedCustomers,
      'customers',
    ),
    row(
      'Drop off',
      `Inactive for ${dropOff.lapsed.inactiveWindowDays}+ days`,
      null,
      dropOff.lapsed.inactiveCustomers,
      'customers',
    ),
    row(
      'Drop off',
      `Inactive for ${dropOff.lapsed.inactiveWindowDays}+ days`,
      'Share of onboarded',
      wholePercent(
        dropOff.lapsed.inactiveCustomers,
        dropOff.lapsed.onboardedCustomers,
      ),
      'percent',
    ),
    row(
      'Drop off',
      'Requested account deletion',
      null,
      dropOff.deletionRequested,
      'customers',
    ),
  ];
}

export function wellnessRows(data: AdminWellnessAnalyticsResponse): Row[] {
  const { savings, goals, habits, levels } = data;
  return [
    row('Savings', 'Saved in window', null, savings.savedInWindow, 'USD'),
    row('Savings', 'Saved in total', null, savings.totalSaved, 'USD'),
    row('Savings', 'Saved before window', null, savings.startingTotal, 'USD'),
    row(
      'Savings',
      'Customers saving in window',
      null,
      savings.saversInWindow,
      'customers',
    ),
    ...savings.weekly.flatMap((item) => [
      row(
        'Savings',
        'Saved per week',
        week(item.weekStart),
        item.amount,
        'USD',
      ),
      row(
        'Savings',
        'Cumulative savings',
        week(item.weekStart),
        item.cumulative,
        'USD',
      ),
    ]),
    row('Goals', 'Active goals', null, goals.activeGoals, 'goals'),
    row('Goals', 'Goals at target', null, goals.reachedTarget, 'goals'),
    ...goals.buckets.map((item) =>
      row('Goals', 'Goal progression', item.label, item.count, 'goals'),
    ),
    ...habits.byFrequency.flatMap((item) => [
      row('Habits', 'Active habits', item.label, item.activeHabits, 'habits'),
      row(
        'Habits',
        'Check-in rate, last 7 days',
        item.label,
        item.last7Days.rate,
        'percent',
      ),
      row(
        'Habits',
        'Check-ins completed, last 7 days',
        item.label,
        item.last7Days.completed,
        'check-ins',
      ),
      row(
        'Habits',
        'Check-ins expected, last 7 days',
        item.label,
        item.last7Days.expected,
        'check-ins',
      ),
      row(
        'Habits',
        'Check-in rate, last 30 days',
        item.label,
        item.last30Days.rate,
        'percent',
      ),
      row(
        'Habits',
        'Check-ins completed, last 30 days',
        item.label,
        item.last30Days.completed,
        'check-ins',
      ),
      row(
        'Habits',
        'Check-ins expected, last 30 days',
        item.label,
        item.last30Days.expected,
        'check-ins',
      ),
    ]),
    ...levels.levels.map((item) =>
      row(
        'Levels',
        'Level distribution',
        `Level ${item.level}`,
        item.count,
        'customers',
      ),
    ),
    row(
      'Levels',
      'Level distribution',
      'No level yet',
      levels.unassignedCount,
      'customers',
    ),
    row(
      'Levels',
      'Level assignment source',
      'Demo data',
      levels.sources.mock,
      'customers',
    ),
    row(
      'Levels',
      'Level assignment source',
      'Calculated',
      levels.sources.calculated,
      'customers',
    ),
    row(
      'Levels',
      'Level assignment source',
      'Manual',
      levels.sources.manual,
      'customers',
    ),
  ];
}

export function pathwayRows(data: AdminPathwayAnalyticsResponse): Row[] {
  const { applications, checklist, partners, eligibility, premium } = data;
  return [
    row(
      'Applications',
      'Applications started',
      null,
      applications.total,
      'applications',
    ),
    ...applications.byStatus.map((item) =>
      row(
        'Applications',
        'Applications by status',
        item.label,
        item.count,
        'applications',
      ),
    ),
    ...applications.byPathway.flatMap((item) => [
      row(
        'Applications',
        'Submitted',
        item.label,
        item.submitted,
        'applications',
      ),
      row('Applications', 'Draft', item.label, item.draft, 'applications'),
    ]),
    row(
      'Checklists',
      'Checklists complete',
      null,
      checklist.fullyComplete,
      'applications',
    ),
    row(
      'Checklists',
      'Applications with a checklist',
      null,
      checklist.applications,
      'applications',
    ),
    row(
      'Checklists',
      'Average checklist progress',
      null,
      checklist.averageProgress,
      'percent',
    ),
    row(
      'Partners',
      'Partner selections',
      null,
      partners.selections,
      'selections',
    ),
    ...partners.byPartner.map((item) =>
      row(
        'Partners',
        'Selections by partner',
        item.label,
        item.count,
        'selections',
      ),
    ),
    ...partners.byType.map((item) =>
      row(
        'Partners',
        'Selections by partner type',
        item.label,
        item.count,
        'selections',
      ),
    ),
    row(
      'Eligibility',
      'Customers with active eligible goals',
      null,
      eligibility.customersWithEligibleGoals,
      'customers',
    ),
    ...eligibility.byPathway.flatMap((item) => [
      row(
        'Eligibility',
        'Minimum savings',
        item.label,
        item.minimumAmount,
        'USD',
      ),
      row(
        'Eligibility',
        'Customers meeting the minimum',
        item.label,
        item.eligibleCustomers,
        'customers',
      ),
    ]),
    row(
      'Plans',
      'Customers on a paid plan',
      null,
      premium.paidCustomers,
      'customers',
    ),
    row(
      'Plans',
      'Share of customers on a paid plan',
      null,
      premium.paidRate,
      'percent',
    ),
    row(
      'Plans',
      'Moved to a paid plan in window',
      null,
      premium.newPaidInWindow,
      'customers',
    ),
    row('Plans', 'Total customers', null, premium.totalCustomers, 'customers'),
    ...premium.byPlan.map((item) =>
      row(
        'Plans',
        'Paid customers by plan',
        `${item.label} ($${item.priceMonthly.toFixed(2)}/mo)`,
        item.count,
        'customers',
      ),
    ),
  ];
}

export function subscriptionRows(
  data: AdminCommercialAnalyticsResponse,
): Row[] {
  const { conversions, intents, cancellations, payments } = data;
  return [
    row(
      'Conversions',
      'Free to paid',
      null,
      conversions.freeToPaid,
      'subscriptions',
    ),
    ...conversions.byAction.map((item) =>
      row(
        'Conversions',
        'Free to paid by action',
        item.label,
        item.count,
        'subscriptions',
      ),
    ),
    ...conversions.byPlan.map((item) =>
      row(
        'Conversions',
        'Free to paid by plan',
        item.label,
        item.count,
        'subscriptions',
      ),
    ),
    row(
      'Upgrade intents',
      'Intents recorded',
      null,
      intents.intents,
      'intents',
    ),
    row(
      'Upgrade intents',
      'Intents now on a paid plan',
      null,
      intents.convertedToPaid,
      'intents',
    ),
    row(
      'Upgrade intents',
      'Intents on the plan asked for',
      null,
      intents.matchedPlan,
      'intents',
    ),
    row(
      'Upgrade intents',
      'Intent conversion',
      null,
      intents.intents === 0 ? null : intents.conversionRate,
      'percent',
    ),
    ...intents.byPlan.flatMap((item) => [
      row('Upgrade intents', 'Intents', item.label, item.intents, 'intents'),
      row('Upgrade intents', 'Now paid', item.label, item.converted, 'intents'),
      row(
        'Upgrade intents',
        'Now paid share',
        item.label,
        wholePercent(item.converted, item.intents),
        'percent',
      ),
    ]),
    row(
      'Cancellations',
      'Cancelled',
      null,
      cancellations.cancelled,
      'subscriptions',
    ),
    row(
      'Cancellations',
      'Scheduled to cancel',
      null,
      cancellations.scheduled,
      'subscriptions',
    ),
    row(
      'Cancellations',
      'Monthly billing given up',
      null,
      cancellations.cancelledMonthlyAmount,
      'USD',
    ),
    ...cancellations.byPlan.flatMap((item) => [
      row(
        'Cancellations',
        'Cancelled',
        item.label,
        item.cancelled,
        'subscriptions',
      ),
      row(
        'Cancellations',
        'Scheduled to cancel',
        item.label,
        item.scheduled,
        'subscriptions',
      ),
    ]),
    row(
      'Payments',
      'Failed payments',
      null,
      payments.failedRecords,
      'payments',
    ),
    row(
      'Payments',
      'Failed payment amount',
      null,
      payments.failedAmount,
      'USD',
    ),
    row(
      'Payments',
      'Successful payments',
      null,
      payments.paidRecords,
      'payments',
    ),
    row(
      'Payments',
      'Successful payment amount',
      null,
      payments.paidAmount,
      'USD',
    ),
    row(
      'Payments',
      'Past due subscriptions',
      null,
      payments.pastDueSubscriptions,
      'subscriptions',
    ),
    row(
      'Payments',
      'Past due monthly amount',
      null,
      payments.pastDueMonthlyAmount,
      'USD',
    ),
    row(
      'Payments',
      'Failed payments on open subscriptions',
      null,
      payments.openFailedPayments,
      'payments',
    ),
  ];
}

export function retentionRows(data: AdminRetentionResponse): Row[] {
  const { overall, cohorts } = data;
  const weekOne = cohorts.flatMap((cohort) =>
    cohort.cells
      .filter((cell) => cell.week === 1 && cell.available)
      .map((cell) => ({ size: cohort.size, active: cell.active ?? 0 })),
  );
  const weekOneSize = weekOne.reduce((sum, cell) => sum + cell.size, 0);
  const weekOneActive = weekOne.reduce((sum, cell) => sum + cell.active, 0);
  return [
    row(
      'Overall',
      'Active in the last 7 days',
      null,
      overall.activeLast7Days,
      'customers',
    ),
    row(
      'Overall',
      'Active in the last 7 days',
      'Share of customers',
      overall.activeLast7DaysRate,
      'percent',
    ),
    row(
      'Overall',
      'Active in the last 30 days',
      null,
      overall.activeLast30Days,
      'customers',
    ),
    row(
      'Overall',
      'Active in the last 30 days',
      'Share of customers',
      overall.activeLast30DaysRate,
      'percent',
    ),
    row(
      'Overall',
      'Total customers',
      null,
      overall.totalCustomers,
      'customers',
    ),
    row(
      'Overall',
      'Week 1 retention',
      'Finished cohorts',
      weekOneSize === 0 ? null : decimalPercent(weekOneActive, weekOneSize),
      'percent',
    ),
    ...cohorts.flatMap((cohort) => [
      row(
        'Cohorts',
        'Cohort size',
        week(cohort.weekStart),
        cohort.size,
        'customers',
      ),
      ...cohort.cells.flatMap((cell) =>
        cell.available
          ? [
              row(
                'Cohorts',
                `Week ${cell.week} active`,
                week(cohort.weekStart),
                cell.active,
                'customers',
              ),
              row(
                'Cohorts',
                `Week ${cell.week} retention`,
                week(cohort.weekStart),
                cell.rate,
                'percent',
              ),
            ]
          : [
              row(
                'Cohorts',
                `Week ${cell.week} retention`,
                week(cohort.weekStart),
                'Not yet',
                'text',
              ),
            ],
      ),
    ]),
  ];
}
