# Administrative Audit Hierarchy

The Audit & Compliance page defaults to a reporting tree. The Detailed overview
tab retains all audit events, including customer security and system events.

Reporting lines are stored per staff account in `users.reports_to_user_id`, not
on the shared role. Each employee has at most one supervisor. Super Admins are
roots. Existing accounts without a supervisor appear as labeled, disconnected roots. The database
rejects self-reporting, cycles, customer supervisors, and removal of a supervisor
until their direct reports are reassigned. Reporting lines do not grant permissions.

The local development seed creates these ten test accounts. All use the local-only
password `PurposeMint123!`. Never run this seed against a production database.

| Account | Role | Reports To |
| --- | --- | --- |
| nesha@purposemint.local | Super Admin | None |
| syed@purposemint.local | Super Admin | None |
| maya@purposemint.local | Manager | Nesha |
| noah@purposemint.local | Manager | Syed |
| owen@purposemint.local | Editor | Maya |
| iris@purposemint.local | Auditor | Maya |
| lena@purposemint.local | Support | Maya |
| eva@purposemint.local | Editor | Noah |
| amir@purposemint.local | Auditor | Noah |
| theo@purposemint.local | Support | Noah |

The seed preserves existing account identities, passwords, and roles. Previously
unassigned non-Super-Admin staff are placed under Nesha. Established reporting
lines are not overwritten. The original development Super Admin is retained.
No historical audit events are fabricated for the new accounts.

Search applies exact action, result, and UTC date filters to all matching audit
records, not just one table page. A staff-name filter narrows the highlighted
people. Yellow backgrounds mean that person's own activity matched; yellow
borders mean a descendant matched. These are search results, not findings of
misconduct. A node can have both states. Clearing the search removes highlights.

Staff popups reuse the TanStack audit table and inherit the applied action/date
filters, with the actor locked to the selected person. Full event metadata still
requires `audit_logs.full`; hierarchy and summaries require `audit_logs.view`.
The role/permission-management implementation is unchanged.

The canvas uses React Flow with Dagre automatic layout. Nodes come from all admin
accounts returned by the hierarchy endpoint, never a hard-coded list. React Flow
measures each node before layout, including wrapped names and activity labels.
New managers and reporting changes are picked up every 30 seconds while visible,
on window focus, or using Refresh. The layout refits when membership, reporting
lines, or node dimensions change; otherwise the current pan/zoom is retained.
A manager with no saved supervisor is shown as unassigned, not silently given a
boss. Supervisor relationships remain data in `users.reports_to_user_id`; this
change does not add supervisor editing to the teammate-owned role-management UI.

Run `pnpm --filter @purposemint/api test:audit:integration` inside the local API
environment for disposable-database tests of reporting constraints and matching.
