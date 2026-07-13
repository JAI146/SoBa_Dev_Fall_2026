ALTER TABLE transfer_proofs
  ADD COLUMN IF NOT EXISTS status varchar(32) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS receiving_method_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS receiving_method_type varchar(64),
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

UPDATE transfer_proofs
SET status = 'pending'
WHERE status IS NULL OR status = '';
