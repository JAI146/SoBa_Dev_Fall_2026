ALTER TABLE sponsorships
  ADD COLUMN IF NOT EXISTS selected_receiving_methods jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS initial_message text,
  ADD COLUMN IF NOT EXISTS initial_message_delivered boolean NOT NULL DEFAULT false;
