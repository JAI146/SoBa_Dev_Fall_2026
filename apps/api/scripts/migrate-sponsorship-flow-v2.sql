ALTER TABLE sponsorships
  ALTER COLUMN duration_months DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS is_ongoing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS selected_receiving_method_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pledge_accepted_at timestamptz,
  ALTER COLUMN receipt_url DROP NOT NULL;

CREATE TABLE IF NOT EXISTS transfer_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsorship_id uuid NOT NULL REFERENCES sponsorships(id) ON DELETE CASCADE,
  donor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url varchar(500) NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sponsor_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsorship_id uuid NOT NULL REFERENCES sponsorships(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  donor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject varchar(200) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sponsor_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES sponsor_tickets(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role varchar(16) NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
