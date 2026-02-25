-- Add description column to token_transactions if missing (fixes PGRST204)
ALTER TABLE token_transactions
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
