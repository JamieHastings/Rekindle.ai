/*
  # Create Payments and Token Packages Tables

  This migration creates tables for:
  1. `payments` - Generic payment tracking for PayPal token purchases
  2. `token_packages` - Token package definitions for purchase

  ## Changes
  - Create `payments` table for PayPal token purchases
  - Create `token_packages` table with default packages
  - Add RLS policies for both tables
*/

-- Create payments table for PayPal token purchases
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  order_id text UNIQUE NOT NULL,
  amount numeric(10, 2) NOT NULL,
  tokens_purchased integer NOT NULL,
  package_name text,
  payment_method text DEFAULT 'paypal' NOT NULL,
  status text DEFAULT 'completed' NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create token_packages table
CREATE TABLE IF NOT EXISTS token_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tokens integer NOT NULL,
  price numeric(10, 2) NOT NULL,
  is_popular boolean DEFAULT false NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Insert default token packages
INSERT INTO token_packages (name, tokens, price, is_popular, is_active) VALUES
  ('Starter', 10, 5.00, false, true),
  ('Popular', 25, 10.00, true, true),
  ('Value', 50, 18.00, false, true),
  ('Premium', 100, 30.00, false, true)
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_token_packages_active ON token_packages(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_packages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments
-- Users can view their own payments
CREATE POLICY "Users can view own payments"
  ON payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own payments
CREATE POLICY "Users can insert own payments"
  ON payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for token_packages
-- Everyone can view active packages
CREATE POLICY "Anyone can view active token packages"
  ON token_packages
  FOR SELECT
  USING (is_active = true);

-- Add updated_at trigger for payments
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- Add updated_at trigger for token_packages
CREATE OR REPLACE FUNCTION update_token_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_token_packages_updated_at
  BEFORE UPDATE ON token_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_token_packages_updated_at();

