ALTER TABLE transfer_proofs
  ADD COLUMN IF NOT EXISTS amount numeric(12, 2),
  ADD COLUMN IF NOT EXISTS transfer_date date;
