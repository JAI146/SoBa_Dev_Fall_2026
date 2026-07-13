-- Migrate sponsorship statuses from the old lifecycle to the new one.
-- Prefer running: pnpm --dir apps/api migrate:sponsorship-statuses
-- Or run this file manually against PostgreSQL before starting the API.

ALTER TABLE sponsorships ADD COLUMN IF NOT EXISTS needs_clarification boolean NOT NULL DEFAULT false;
ALTER TABLE sponsorships ADD COLUMN IF NOT EXISTS activated_at timestamptz NULL;
ALTER TABLE sponsorships ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL;

-- Convert enum to text so legacy values can be rewritten safely.
ALTER TABLE sponsorships ALTER COLUMN status TYPE text USING status::text;

UPDATE sponsorships SET status = 'requested', needs_clarification = false WHERE status = 'pending';
UPDATE sponsorships SET status = 'requested', needs_clarification = true WHERE status = 'need_clarification';
UPDATE sponsorships SET status = 'active', activated_at = COALESCE(activated_at, reviewed_at, created_at) WHERE status = 'approved';
UPDATE sponsorships SET status = 'cancelled' WHERE status = 'rejected';

DROP TYPE IF EXISTS sponsorships_status_enum;

-- Restart the API after this. TypeORM synchronize will recreate the enum
-- with the new values and cast the text column back to enum.
