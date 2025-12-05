/*
  # Add n8n Integration Tables

  ## Overview
  This migration creates supporting tables for n8n workflow integration including email tracking,
  Stripe payment records, webhook execution logs, and user email preferences.

  ## New Tables

  ### 1. `email_logs`
  Tracks all emails sent through the system
  - `id` (uuid, primary key) - Unique email log identifier
  - `user_id` (uuid) - Links to profiles(id)
  - `email_type` (text) - Type: welcome, receipt, gift_card, check_up, low_tokens
  - `recipient_email` (text) - Email address of recipient
  - `subject` (text) - Email subject line
  - `status` (text) - Status: pending, sent, failed, bounced
  - `provider_message_id` (text) - Message ID from email provider
  - `metadata` (jsonb) - Additional data (template used, variables, etc.)
  - `sent_at` (timestamptz) - When email was sent
  - `created_at` (timestamptz) - Record creation timestamp

  ### 2. `stripe_payments`
  Stores Stripe payment transaction details
  - `id` (uuid, primary key) - Unique payment record identifier
  - `user_id` (uuid) - Links to profiles(id)
  - `stripe_payment_intent_id` (text) - Stripe payment intent ID
  - `stripe_checkout_session_id` (text) - Stripe checkout session ID
  - `amount_cents` (integer) - Payment amount in cents
  - `currency` (text) - Currency code (USD, EUR, etc.)
  - `token_count` (integer) - Number of tokens purchased
  - `status` (text) - Status: pending, succeeded, failed, refunded
  - `metadata` (jsonb) - Additional Stripe metadata
  - `created_at` (timestamptz) - Payment creation timestamp
  - `completed_at` (timestamptz) - When payment completed

  ### 3. `n8n_webhook_logs`
  Logs n8n webhook executions for debugging and monitoring
  - `id` (uuid, primary key) - Unique log identifier
  - `workflow_name` (text) - Name of n8n workflow executed
  - `execution_id` (text) - n8n execution ID
  - `status` (text) - Status: success, error, timeout
  - `request_payload` (jsonb) - Incoming webhook payload
  - `response_payload` (jsonb) - Outgoing response data
  - `error_message` (text) - Error details if failed
  - `execution_time_ms` (integer) - Execution duration in milliseconds
  - `created_at` (timestamptz) - Log timestamp

  ### 4. `email_preferences` (added to profiles)
  Column additions to profiles table for email preference management
  - `email_marketing` (boolean) - Allow marketing emails
  - `email_notifications` (boolean) - Allow notification emails
  - `email_receipts` (boolean) - Allow receipt emails

  ## Security
  - All tables have RLS enabled
  - Users can only view their own data
  - Service role required for webhook logs

  ## Indexes
  - Indexes on user_id for fast queries
  - Index on email status for filtering
  - Index on payment status for reporting
  - Index on created_at for time-based queries
*/

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  email_type text NOT NULL CHECK (email_type IN ('welcome', 'receipt', 'gift_card', 'check_up', 'low_tokens')),
  recipient_email text NOT NULL,
  subject text NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  provider_message_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create stripe_payments table
CREATE TABLE IF NOT EXISTS stripe_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id text UNIQUE,
  stripe_checkout_session_id text UNIQUE,
  amount_cents integer NOT NULL,
  currency text DEFAULT 'usd' NOT NULL,
  token_count integer NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz
);

-- Create n8n_webhook_logs table
CREATE TABLE IF NOT EXISTS n8n_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name text NOT NULL,
  execution_id text,
  status text NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  execution_time_ms integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add email preference columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_marketing'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_marketing boolean DEFAULT true NOT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_notifications'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_notifications boolean DEFAULT true NOT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_receipts'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_receipts boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_user_id ON stripe_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_status ON stripe_payments(status);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_created_at ON stripe_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_workflow ON n8n_webhook_logs(workflow_name);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON n8n_webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON n8n_webhook_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Email logs policies
CREATE POLICY "Users can view own email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Stripe payments policies
CREATE POLICY "Users can view own payments"
  ON stripe_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Webhook logs policies (service role only for security)
CREATE POLICY "Service role can insert webhook logs"
  ON n8n_webhook_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can view webhook logs"
  ON n8n_webhook_logs FOR SELECT
  TO service_role
  USING (true);