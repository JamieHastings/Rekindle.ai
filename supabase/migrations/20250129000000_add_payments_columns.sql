-- Add columns to payments table for token purchase flow
-- payment_id: PayPal order ID (preferred over order_id)
-- amount_cents: Amount in cents for reporting
-- currency: Currency code
-- product: Human-readable product description

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS amount_cents integer,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS product text;

-- Allow order_id to be null when payment_id is used
ALTER TABLE payments
  ALTER COLUMN order_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id) WHERE payment_id IS NOT NULL;
