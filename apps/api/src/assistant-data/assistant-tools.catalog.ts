import * as C from '@purposemint/contracts';
import { z, type ZodTypeAny } from 'zod';

type Field = {
  type: 'string' | 'integer' | 'boolean';
  description?: string;
  enum?: readonly string[];
  format?: 'uuid';
  minimum?: number;
  maximum?: number;
};
const str = (description?: string): Field => ({ type: 'string', description });
const uuid: Field = { type: 'string', format: 'uuid' };
const flag: Field = { type: 'boolean' };
const choice = (...values: string[]): Field => ({
  type: 'string',
  enum: values,
});
const page = {
  page: { type: 'integer', minimum: 1, maximum: 100000 } as Field,
  pageSize: { type: 'integer', minimum: 1, maximum: 50 } as Field,
};
const dates = {
  from: str('Inclusive YYYY-MM-DD date in UTC'),
  to: str('Inclusive YYYY-MM-DD date in UTC'),
};
const customer = { customerId: uuid };
const search = {
  search: str('Name, email, or search text supported by this dashboard page'),
};
const resource = (
  key: string,
  path: string,
  schema: ZodTypeAny,
  query: Record<string, unknown> = {},
  gateOnly = false,
): ReadResource => ({ key, path, schema, query, gateOnly });
const pick = (args: Args, keys: string[]) =>
  Object.fromEntries(
    keys
      .filter((key) => args[key] !== undefined)
      .map((key) => [key, args[key]]),
  );
const paged = (args: Args, extra: string[] = []) => ({
  pageSize: 25,
  ...pick(args, ['page', 'pageSize', ...extra]),
});
export type Args = Record<string, string | number | boolean | undefined>;
export type ReadResource = {
  key: string;
  path: string;
  schema: ZodTypeAny;
  query: Record<string, unknown>;
  gateOnly?: boolean;
};
export type ToolSpec = {
  name: string;
  description: string;
  fields: Record<string, Field>;
  reads: (args: Args) => ReadResource[];
  note?: string;
};

// Only explicit, dashboard-backed GET resources belong here. No model-provided URLs or methods.
export const assistantToolSpecs: ToolSpec[] = [
  {
    name: 'get_dashboard_overview',
    description:
      'Dashboard overview: customers, activity, onboarding, memberships, goals, habits, applications and upgrade demand.',
    fields: {},
    reads: () => [
      resource('overview', 'admin/overview', C.adminOverviewResponseSchema),
    ],
  },
  {
    name: 'get_analytics_report',
    description:
      'Full dashboard aggregate report. Choose users (acquisition, activation, funnel), wellness (savings, goals, habits, levels), pathways (applications, partners, eligibility, premium), subscriptions (conversions, cancellations, payment health), retention (cohorts). Use days OR both dates. Current snapshots are not historical trends. CSV export requires a separate permission and is not exposed.',
    fields: {
      report: choice(
        'users',
        'wellness',
        'pathways',
        'subscriptions',
        'retention',
      ),
      days: { type: 'integer', minimum: 30, maximum: 180 },
      ...dates,
    },
    reads: (a) => {
      const report = String(a.report ?? 'users');
      const reports: Record<string, [string, ZodTypeAny]> = {
        users: ['users', C.adminUserAnalyticsResponseSchema],
        wellness: ['wellness', C.adminWellnessAnalyticsResponseSchema],
        pathways: ['pathways', C.adminPathwayAnalyticsResponseSchema],
        subscriptions: ['commercial', C.adminCommercialAnalyticsResponseSchema],
        retention: ['retention', C.adminRetentionResponseSchema],
      };
      const [path, schema] = reports[report];
      return [
        resource(
          'report',
          'admin/analytics/' + path,
          schema,
          pick(a, ['days', 'from', 'to']),
        ),
      ];
    },
    note: 'Analytics definitions and availability flags match the dashboard. Savings are self-reported. Snapshot metrics do not establish changes over time.',
  },
  {
    name: 'get_customer_report',
    description:
      'Search customers or retrieve one customer profile with goals, savings, habits and consistency, onboarding, values, pathway applications and activity counts. Reflections are count-only. Use search to resolve a name to a UUID. includeIncentives requires separate Super Admin access.',
    fields: {
      ...customer,
      ...search,
      ...page,
      status: choice(...C.userStatusValues),
      tier: choice(...C.tierValues),
      onboardingStatus: choice(...C.onboardingStatusValues),
      inactiveDays: { type: 'integer', minimum: 1, maximum: 365 },
      includeIncentives: flag,
    },
    reads: (a) =>
      a.customerId
        ? [
            resource(
              'customer',
              'admin/users/' + a.customerId,
              C.adminUserDetailResponseSchema,
            ),
            ...(a.includeIncentives
              ? [
                  resource(
                    'incentives',
                    'admin/incentives/benefits',
                    C.incentiveBenefitsSchema,
                    { ...paged(a), userId: a.customerId },
                  ),
                ]
              : []),
          ]
        : [
            resource(
              'customers',
              'admin/users',
              C.adminUsersResponseSchema,
              paged(a, [
                'search',
                'status',
                'tier',
                'onboardingStatus',
                'inactiveDays',
              ]),
            ),
          ],
  },
  {
    name: 'get_progress_levels',
    description:
      'Current level distribution and unassigned count; optionally customers assigned to a selected level with assignment date and source. Level assignments are currently demo data, not verified progression history.',
    fields: { ...page, level: { type: 'integer', minimum: 1, maximum: 5 } },
    reads: (a) => [
      resource(
        'levels',
        'admin/progress/levels',
        C.adminProgressLevelsResponseSchema,
      ),
      ...(a.level
        ? [
            resource(
              'customers',
              'admin/progress/levels/' + a.level + '/users',
              C.adminProgressLevelUsersResponseSchema,
              paged(a),
            ),
          ]
        : []),
    ],
    note: 'Level rules and historical progression are not implemented; preserve mock/calculated/manual source labels.',
  },
  {
    name: 'get_savings_progress',
    description:
      'Preferred tool for charts of all customers and their savings progress: omit customerId and request pageSize 50 to retrieve customer name, savedAmount, targetAmount and progressPercent together, without individual profile calls. Check customers.pagination for complete coverage. Select customerId only for goals and dated contributions. Dates filter contributions only, balances remain all-time. Resolve a specific customer name using get_customer_report first. page, goalPage and entryPage are independent. Self-reported, not bank verified.',
    fields: {
      ...customer,
      ...page,
      ...dates,
      goalPage: page.page,
      entryPage: page.page,
    },
    reads: (a) => [
      resource(
        'savings',
        'admin/assistant-data/savings-progress',
        C.savingsProgressDataResponseSchema,
        {
          ...paged(a, ['customerId', 'from', 'to', 'goalPage', 'entryPage']),
          pageSize: a.pageSize ?? 50,
        },
      ),
    ],
    note: 'Self-reported savings. Date filters apply only to entries, not all-time balances. Each nested collection has its own pagination.',
  },
  {
    name: 'get_badge_report',
    description:
      'Badge definitions, rules, rewards, activity/version dates and award counts; awards identify customers and unlock dates. section catalog, awards or all. Search/filter and page catalog and award collections independently with the same page/pageSize. Use get_audit_report for who created or changed badges.',
    fields: {
      section: choice('catalog', 'awards', 'all'),
      ...page,
      ...search,
      active: flag,
      badgeId: uuid,
    },
    reads: (a) => [
      ...(a.section !== 'awards' || a.active !== undefined
        ? [resource('catalog', 'admin/badges', C.badgesResponseSchema)]
        : []),
      ...(a.section !== 'catalog'
        ? [
            resource(
              'awards',
              'admin/badges/awards',
              C.badgeAwardsResponseSchema,
            ),
          ]
        : []),
    ],
  },
  {
    name: 'get_pathway_report',
    description:
      'Pathway and partner catalog, applications, intake/readiness and eligibility. Filter the workspace by search, pathwayKey, application status, active catalog status or readiness; page applies separately to each collection. Select applicationId for full checklist, attestation and partner details. No live capacity, delivered referrals, partner acceptance or verified real-world outcomes exist.',
    fields: {
      applicationId: uuid,
      ...page,
      ...search,
      pathwayKey: str(),
      status: choice('draft', 'submitted'),
      active: flag,
      readiness: choice('ready', 'pending'),
    },
    reads: (a) =>
      a.applicationId
        ? [
            resource(
              'application',
              'admin/pathway-applications/' + a.applicationId,
              C.adminPathwayApplicationDetailResponseSchema,
            ),
          ]
        : [
            resource(
              'workspace',
              'admin/pathway-management',
              C.pathwayManagementResponseSchema,
            ),
          ],
    note: 'Partner selections are not completed referrals; checklist readiness does not verify external outcomes. Savings eligibility is self-attested.',
  },
  {
    name: 'get_incentive_report',
    description:
      'Super Admin incentive programs, recipient eligibility/balances, ledger events, goal allocations and analytics. Select benefitId for full event history. Amounts ending Cents are integer USD cents. Ledger entries are staff-recorded, not proof of bank transfer.',
    fields: {
      benefitId: uuid,
      programId: uuid,
      userId: uuid,
      ...search,
      ...page,
      ...dates,
      status: choice(...C.incentiveStatuses),
      metric: choice(
        'eligible',
        'earned',
        'distributed',
        'allocated',
        'withdrawn',
        'remaining',
      ),
    },
    reads: (a) =>
      a.benefitId
        ? [
            resource(
              'benefit',
              'admin/incentives/benefits/' + a.benefitId,
              C.incentiveDetailSchema,
            ),
          ]
        : [
            resource(
              'programs',
              'admin/incentives/programs',
              C.incentiveProgramsSchema,
            ),
            resource(
              'benefits',
              'admin/incentives/benefits',
              C.incentiveBenefitsSchema,
              paged(a, [
                'programId',
                'userId',
                'search',
                'from',
                'to',
                'status',
                'metric',
              ]),
            ),
            resource(
              'analytics',
              'admin/incentives/analytics',
              C.incentiveAnalyticsSchema,
              pick(a, [
                'programId',
                'userId',
                'search',
                'from',
                'to',
                'status',
                'metric',
              ]),
            ),
          ],
  },
  {
    name: 'get_subscription_report',
    description:
      'Search subscriptions by customer/status/plan, or select subscriptionId for billing records, scheduled changes, entitlements and change history. Staff payment records do not collect payment. Cents fields are USD cents.',
    fields: {
      subscriptionId: uuid,
      ...search,
      ...page,
      status: choice(...C.subscriptionStatusValues),
      planKey: str(),
    },
    reads: (a) =>
      a.subscriptionId
        ? [
            resource(
              'subscription',
              'admin/subscription-management/subscriptions/' + a.subscriptionId,
              C.adminSubscriptionDetailSchema,
            ),
          ]
        : [
            resource(
              'subscriptions',
              'admin/subscription-management/subscriptions',
              C.adminSubscriptionsResponseSchema,
              paged(a, ['search', 'status', 'planKey']),
            ),
          ],
  },
  {
    name: 'get_plan_catalog',
    description:
      'Plan descriptions, features, monthly/yearly prices, entitlements, limits, availability, promotions, default status and versions.',
    fields: { ...search, ...page, active: flag },
    reads: (a) => [
      resource(
        'plans',
        'admin/subscription-management/plans',
        C.adminPlansResponseSchema,
        paged(a, ['search', 'active']),
      ),
    ],
  },
  {
    name: 'get_upgrade_intents',
    description:
      'Upgrade requests with customer identity, requested plan, request dates and counts by plan. An intent is not an actual subscription conversion.',
    fields: { ...page },
    reads: (a) => [
      resource(
        'requests',
        'admin/upgrade-intents',
        C.adminUpgradeIntentsResponseSchema,
        paged(a),
      ),
    ],
  },
  {
    name: 'get_support_case_report',
    description:
      'Search support cases/complaints by number, subject or customer, status/priority/category/assignee. Select caseId for details, resolution and audit history. includeCustomerContext also requires customer-profile access. Status dates can support age/resolution calculations; do not invent SLA targets.',
    fields: {
      caseId: uuid,
      ...search,
      ...page,
      status: choice(...C.supportCaseStatusValues),
      priority: choice(...C.supportCasePriorityValues),
      type: choice(...C.supportCaseTypeValues),
      categoryId: uuid,
      assignee: str('Staff UUID or unassigned'),
      includeCustomerContext: flag,
    },
    reads: (a) =>
      a.caseId
        ? [
            resource(
              'case',
              'admin/support-cases/' + a.caseId,
              C.supportCaseDetailSchema,
            ),
            resource(
              'history',
              'admin/support-cases/' + a.caseId + '/history',
              C.supportCaseHistoryResponseSchema,
            ),
          ]
        : [
            resource(
              'cases',
              'admin/support-cases',
              C.supportCasesResponseSchema,
              paged(a, [
                'search',
                'status',
                'priority',
                'type',
                'categoryId',
                'assignee',
              ]),
            ),
            resource(
              'categories',
              'admin/support-cases/categories',
              C.supportCaseCategoriesResponseSchema,
            ),
          ],
  },
  {
    name: 'get_kyc_report',
    description:
      'Verification statuses, stuck/escalated cases, retry attempts/limits and permitted provider failure details. Optional customerId adds case action history. Restricted details remain restricted. Filter list with search, status, stuck and escalated.',
    fields: {
      ...customer,
      ...search,
      ...page,
      status: choice(...C.kycStatusValues),
      stuck: flag,
      escalated: flag,
    },
    reads: (a) => [
      resource(
        'cases',
        'admin/kyc',
        C.adminKycResponseSchema,
        paged(a, ['search', 'status', 'stuck', 'escalated']),
      ),
      ...(a.customerId
        ? [
            resource(
              'history',
              'admin/kyc/' + a.customerId + '/history',
              C.adminKycHistoryResponseSchema,
            ),
          ]
        : []),
    ],
  },
  {
    name: 'get_audit_report',
    description:
      'Search ALL matching actors unless employeeId/name supplied. For my activity use signed-in UUID. Exact action enum only: badge creation is admin.badge_created. Returns named events and full-filter counts by actor/action/outcome/day. includeDetails requires audit_logs.full. A zero match establishes only no records under these filters. Default UTC date window is 30 days back.',
    fields: {
      ...page,
      ...dates,
      employeeId: uuid,
      employeeName: str(),
      action: choice(...Object.values(C.AuditAction)),
      outcome: choice('success', 'failure'),
      entityType: str(),
      entityId: str(),
      includeDetails: flag,
    },
    reads: (a) => [
      resource(
        'audit',
        'admin/assistant-data/audit-report',
        C.auditReportResponseSchema,
        paged(a, [
          'from',
          'to',
          'employeeId',
          'employeeName',
          'action',
          'outcome',
          'entityType',
          'entityId',
          'includeDetails',
        ]),
      ),
    ],
  },
  {
    name: 'get_staff_access_report',
    description:
      'Role-management report: staff roles, effective permissions, override indicators and role permission profiles. Requires role-management access as well as staff access; optionally includes customer account rows as on Manage roles.',
    fields: { ...search, ...page, includeCustomers: flag },
    reads: (a) => [
      resource(
        'roles',
        'admin/role-permissions',
        C.adminRolePermissionProfilesResponseSchema,
      ),
      resource(
        'staff',
        'admin/staff',
        C.adminStaffResponseSchema,
        paged(a, ['search']),
      ),
      ...(a.includeCustomers
        ? [
            resource(
              'customers',
              'admin/users',
              C.adminUsersResponseSchema,
              paged(a, ['search']),
            ),
          ]
        : []),
    ],
  },
  {
    name: 'get_notification_report',
    description:
      'Notification activity/status/reasons, recipients, automation status and category rules. section preferences with customerId reads customer channel choices, opt-out and quiet hours; section email reads only masked email connection settings and requires full settings access. Push is not connected.',
    fields: {
      section: choice('activity', 'preferences', 'email'),
      ...customer,
      ...page,
      status: choice(...C.notificationStatusSchema.options),
      categoryKey: str(),
      channel: choice('push', 'email'),
    },
    reads: (a) =>
      a.section === 'preferences'
        ? [
            resource(
              'customerAccess',
              'admin/users',
              C.adminUsersResponseSchema,
              { pageSize: 1 },
              true,
            ),
            resource(
              'preferences',
              'admin/notifications/users/' + a.customerId + '/preferences',
              C.notificationSettingsResponseSchema,
            ),
          ]
        : a.section === 'email'
          ? [
              resource(
                'access',
                'admin/notifications',
                C.notificationOperationsSchema,
                {},
                true,
              ),
              resource(
                'email',
                'admin/notifications/smtp',
                C.notificationSmtpResponseSchema,
              ),
            ]
          : [
              resource(
                'activity',
                'admin/notifications',
                C.notificationOperationsSchema,
                {
                  ...pick(a, ['page', 'status', 'categoryKey', 'channel']),
                  ...(a.customerId ? { userId: a.customerId } : {}),
                },
              ),
            ],
  },
  {
    name: 'get_coaching_operations',
    description:
      'KiroMoney operational metadata: generation/delivery status, issue codes, review flags, source and service observations. Never returns private coaching prompts or responses. Integration availability and development-sample flags must be disclosed.',
    fields: {
      page: page.page,
      eventType: choice(...C.coachingEventSchema.options),
      generationStatus: choice(...C.coachingGenerationSchema.options),
      deliveryStatus: choice(...C.notificationStatusSchema.options),
      safetyFlag: choice(...C.coachingFlagSchema.options),
      source: choice(...C.coachingSourceSchema.options),
    },
    reads: (a) => [
      resource(
        'operations',
        'admin/coaching-operations',
        C.coachingOperationsResponseSchema,
        pick(a, [
          'page',
          'eventType',
          'generationStatus',
          'deliveryStatus',
          'safetyFlag',
          'source',
        ]),
      ),
    ],
  },
  {
    name: 'get_system_health',
    description:
      'Service health, issue categories, sources, timestamps, latency, staleness and staff observations. Only API/database checks are live; external provider status may be unmonitored or staff-reported and expire after 24 hours.',
    fields: {},
    reads: () => [
      resource('health', 'admin/system-health', C.systemHealthResponseSchema),
    ],
  },
];

export function toolArguments(spec: ToolSpec, input: unknown): Args {
  const shape: Record<string, ZodTypeAny> = {};
  for (const [key, f] of Object.entries(spec.fields)) {
    const schema: ZodTypeAny = f.enum
      ? z.enum(f.enum as [string, ...string[]])
      : f.type === 'boolean'
        ? z.boolean()
        : f.type === 'integer'
          ? z
              .number()
              .int()
              .min(f.minimum ?? 1)
              .max(f.maximum ?? 100000)
          : f.format === 'uuid'
            ? z.string().uuid()
            : z.string().trim().min(1).max(255);
    shape[key] = schema.optional();
  }
  return z.object(shape).strict().parse(input);
}
export const assistantReadTools = assistantToolSpecs.map((spec) => ({
  type: 'function',
  name: spec.name,
  description: spec.description,
  strict: false,
  parameters: {
    type: 'object',
    properties: spec.fields,
    additionalProperties: false,
  },
}));
