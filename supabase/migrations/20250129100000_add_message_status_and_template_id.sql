-- Add status and template_id to generated_messages for stub-then-update flow
-- status: 'generating' when stub is created, 'completed' when OpenAI fills content
-- template_id: design template ID when user selects a template

ALTER TABLE generated_messages
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS template_id uuid;

CREATE INDEX IF NOT EXISTS idx_messages_status ON generated_messages(status) WHERE status IS NOT NULL;
