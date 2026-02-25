-- Backfill generated_content from output_text for rows where content was saved to output_text
-- Run this if messages were generated but dashboard showed empty (content in output_text).

-- Add output_text column if it exists elsewhere (e.g. from an older edge function)
ALTER TABLE generated_messages
  ADD COLUMN IF NOT EXISTS output_text text;

-- Copy output_text into generated_content where generated_content is empty
UPDATE generated_messages
SET generated_content = output_text
WHERE (generated_content IS NULL OR generated_content = '')
  AND output_text IS NOT NULL
  AND output_text != '';
