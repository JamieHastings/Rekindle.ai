/*
  # Add input_data and is_preview columns to generated_messages

  This migration adds columns to store the full form input data as JSON
  and track whether a message was generated from a preview.

  ## Changes
  - Add `input_data` (jsonb) - Stores the complete form data as JSON
  - Add `is_preview` (boolean) - Indicates if message was unlocked from a preview
*/

-- Add input_data column to store full form data as JSON
ALTER TABLE generated_messages 
ADD COLUMN IF NOT EXISTS input_data jsonb;

-- Add is_preview column to track preview messages
ALTER TABLE generated_messages 
ADD COLUMN IF NOT EXISTS is_preview boolean DEFAULT false NOT NULL;

-- Add index on input_data for potential queries (optional but useful)
CREATE INDEX IF NOT EXISTS idx_messages_input_data ON generated_messages USING gin(input_data);

