/*
  # Create Security Events Table

  ## Overview
  This migration creates a table to log security events for monitoring and auditing.
  Tracks password breach blocks, weak password warnings, MFA events, and other security incidents.

  ## New Table

  ### `security_events`
  - `id` (uuid, primary key) - Unique event identifier
  - `event_type` (text) - Type of security event
  - `user_id` (uuid, optional) - User who triggered the event (if authenticated)
  - `email` (text, optional) - Email associated with event (for signup attempts)
  - `ip_address` (text, optional) - IP address of the request
  - `user_agent` (text, optional) - User agent string
  - `metadata` (jsonb, optional) - Additional event data
  - `created_at` (timestamptz) - Event timestamp

  ## Security
  - RLS enabled - only admins can view all events
  - Users can view their own events
*/

-- Create security_events table
CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_email ON security_events(email);

-- Enable Row Level Security
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own security events
CREATE POLICY "Users can view own security events"
  ON security_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role can insert events (for logging)
-- Note: This requires service role key, typically done server-side
-- For client-side, we'll use a function with SECURITY DEFINER

-- Function to log security events (bypasses RLS for inserts)
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type text,
  p_user_id uuid DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO security_events (
    event_type,
    user_id,
    email,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_event_type,
    p_user_id,
    p_email,
    p_ip_address,
    p_user_agent,
    p_metadata
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_security_event TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event TO anon;

-- Policy: Admins can view all security events
-- Note: This assumes you have an is_admin field in profiles
-- You may need to adjust this based on your admin setup
CREATE POLICY "Admins can view all security events"
  ON security_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

