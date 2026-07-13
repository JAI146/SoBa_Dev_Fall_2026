-- Add password reset OTP columns for forgot-password flow.
-- Run: node scripts/migrate-password-reset-otp.mjs

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_reset_otp_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password_reset_otp_expires_at TIMESTAMPTZ;
