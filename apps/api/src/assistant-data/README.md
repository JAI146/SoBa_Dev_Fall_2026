# Dashboard assistant tools

The assistant exposes 18 read-only domain reports, defined in assistant-tools.catalog.ts:

- get_dashboard_overview
- get_analytics_report (users, wellness, pathways, subscriptions, retention)
- get_customer_report (search, profile and optional incentives)
- get_progress_levels (distribution and level members)
- get_savings_progress (customers, goals and dated entries)
- get_badge_report (catalog and awards)
- get_pathway_report (catalog, partners, intake and application details)
- get_incentive_report (programs, benefits, events and analytics)
- get_subscription_report (list, detail, billing and history)
- get_plan_catalog
- get_upgrade_intents
- get_support_case_report (list, detail, history and optional customer context)
- get_kyc_report (verification queue and optional customer history)
- get_audit_report (all-actor search, named events and full-filter aggregates)
- get_staff_access_report (staff, effective permissions and role profiles)
- get_notification_report (activity, preferences or masked email settings)
- get_coaching_operations
- get_system_health

## Access boundary

AssistantToolsService forwards the original authenticated Bearer credential to a
fixed allowlist of this application's GET endpoints on loopback. The model supplies
only validated filters and record IDs, never a method, URL, credential or SQL query.
Each endpoint runs the same current JWT identity, roles, permission overrides and
field restriction rules as the dashboard. No service account or elevated credential
is used. Redirects are disabled. Each tool rechecks the active actor, and chat
rechecks assistant access before tools and model calls. Active Super Admins have
built-in access. Other administrators need an approved request and a positive
budget allocation.

Every resource must pass its shared dashboard response schema before it can reach
the model. A denied or invalid required section fails the entire report, without
releasing partial data or chart datasets. Role reports require role-management
access before reading staff. Notification email settings require notification-page
access plus the SMTP endpoint's settings permission. Notification preferences also
require the customer browser permission. Optional customer/incentive sections check
their own endpoint permissions. Raw errors, IP addresses, profile image URLs,
credential fields and recognizable credential strings are excluded. SMTP passwords,
private reflection text and private coaching conversations are never exposed.

The controller records each submitted prompt before calling the model and stores
the answer and charts when available. Existing dashboard endpoints retain their
normal read audits. The Super Admin control panel is the only API surface that
returns transcripts. Earlier audited prompts are imported during migration.
Earlier answers and model usage are unavailable.

Budget months use UTC. Flexible allocations share the overall cap. Balanced
allocations sum to at most 100%, and newly approved staff start at zero in that
mode. The backend locks the budget row to reserve funds before each model call
and settles the reservation using reported usage. If provider billing is uncertain
after a failure, the estimate remains reserved for the current month. Supported
model prices are defined in assistant-control.service.ts.

## Size, provenance and charts

The adapter limits each array to 50 records and each text field to 4,000 characters,
with explicit truncation metadata. Oversized source responses or reports are rejected
with a request to narrow filters. It does not silently represent the first page as a
full report. Provider availability, restricted fields, source flags and verification
labels from the dashboard are preserved. Cents fields remain integer USD cents.

Chart datasets are derived from validated, permitted DTO collections, including
nested numeric fields. The model chooses a dataset, fields and bar/line/area/pie type;
the backend calculates the values and validates the result. Audit summary charts use
sum/count for full event totals rather than counting aggregate rows. Charts carry
page/filter scope; incomplete groups and arrays must be disclosed. No executable
code, arbitrary SQL, CRUD, exports or external messages are available to the model.

The Responses loop permits six tool calls, seven model rounds and three charts per
reply. The former get_employee_audit name remains accepted internally for compatibility,
but the model catalog uses get_audit_report. The original bounded assistant-data REST
reports remain available and retain their direct-service permission checks.

## Future tool design

Prefer versatile domain reports over one-question lookups. Include permitted related
records, useful backend-calculated summaries, precise filter vocabularies and optional
drill-downs. Reuse existing dashboard endpoints and contracts rather than duplicating
business queries or access rules. Every new endpoint must have a response schema and
permission-denial coverage. Never send entire entities or unbounded tables to a model.
New aggregates must use the same authorized record scope as their underlying pages.

Explicit chart requests retry a prose-only answer with a required create_chart call when
a permitted dataset exists. Per-customer progress uses aggregate value, preserving
individual percentages instead of summing same-name customers. Bulk savings
comparisons use the customer-summary endpoint, with pagination coverage disclosed.
