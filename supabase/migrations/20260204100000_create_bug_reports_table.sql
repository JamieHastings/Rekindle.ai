-- Bug reports table for Dashboard support form (dual submission: FormSubmit.co + Supabase)

CREATE TABLE IF NOT EXISTS bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
  user_email text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  steps_to_reproduce text NULL,
  expected_behavior text NULL,
  actual_behavior text NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own bug reports (user_id = auth.uid() or null)
CREATE POLICY "Users can insert own bug reports"
  ON bug_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Users can view only their own bug reports
CREATE POLICY "Users can view own bug reports"
  ON bug_reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger to update updated_at (reuse existing function if present)
CREATE TRIGGER update_bug_reports_updated_at
  BEFORE UPDATE ON bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
