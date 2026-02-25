-- Create pdf_payments table to track PDF download payments
CREATE TABLE IF NOT EXISTS pdf_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paypal_order_id TEXT NOT NULL UNIQUE,
  message_type TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pdf_payments_user_id ON pdf_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_payments_order_id ON pdf_payments(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_pdf_payments_status ON pdf_payments(status);

-- Enable RLS
ALTER TABLE pdf_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own payments
CREATE POLICY "Users can view own pdf payments"
  ON pdf_payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert (via edge functions)
CREATE POLICY "Service role can insert pdf payments"
  ON pdf_payments
  FOR INSERT
  WITH CHECK (false); -- Edge functions use service_role, bypassing RLS

-- Only service role can update
CREATE POLICY "Service role can update pdf payments"
  ON pdf_payments
  FOR UPDATE
  USING (false); -- Edge functions use service_role, bypassing RLS

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_pdf_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pdf_payments_updated_at
  BEFORE UPDATE ON pdf_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_pdf_payments_updated_at();

