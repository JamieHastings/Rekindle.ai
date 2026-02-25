-- Simplify generated_messages: metadata lives in input_data (JSONB).
-- Make legacy columns nullable so inserts can omit them.

ALTER TABLE generated_messages
  ALTER COLUMN recipient_name DROP NOT NULL,
  ALTER COLUMN relationship_length DROP NOT NULL,
  ALTER COLUMN character_length DROP NOT NULL;
