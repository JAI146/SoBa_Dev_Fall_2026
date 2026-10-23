# 14.1 User Notification Management

Open the customer mobile app: Profile → Notification management.

Eight optional categories have independent push and email controls: Goals, Habits, Weekly Savings, Savings Recommendations, Progress & Milestones, Pathway Recommendations, Coaching / KiroMoney and Other Optional Communications. Required Security, Critical App Updates and Transaction communications always enable both channels. The mobile switches are disabled for those categories, and the API rejects requests that try to turn either channel off.

Settings use the existing user's notification_preferences JSON column under categorySettings. No new table or migration is needed. Authenticated customer endpoints GET/PATCH `/api/notifications/preferences` derive the user ID from the session, never from the request body. Updates lock the user's row and record an audit event atomically. Explicit legacy goal-reminder, weekly-check-in and product-update settings map to their category and both channels. Other new optional categories default off. The old preference endpoint also rejects disabling security alerts.

This patch contains 14.1 only. There is no admin notification dashboard, re-engagement scheduler, new delivery queue or KiroMoney integration. Actual push/email dispatch remains blocked by missing provider requirements. Choices persist for future delivery and the mobile screen states that delivery is not connected.

Apply this patch instead of the earlier combined notifications/coaching patch. It assumes the previous System & Provider Health patch is already present. If the combined patch was already applied, do not apply this overlapping patch; retain the combined code and review only its customer preference screen.

Checks: API/mobile type-checks, seven preference tests and a PostgreSQL-compatible persistence check covering saved independent channels, mandatory rejection, partial category updates, audit persistence and legacy endpoint compatibility. Browser/emulator review remains pending.
