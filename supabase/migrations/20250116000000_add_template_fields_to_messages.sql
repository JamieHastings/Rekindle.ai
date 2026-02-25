/*
  # Add template_url and paid fields to generated_messages

  This migration adds columns to track template usage and premium payments for messages.

  ## Changes
  - Add `template_url` (text, nullable) - URL of the design template used
  - Add `paid` (boolean) - Indicates if this message required payment (for premium templates)
*/

-- Add template_url column to store template URL
ALTER TABLE generated_messages 
ADD COLUMN IF NOT EXISTS template_url text;

-- Add paid column to track premium messages
ALTER TABLE generated_messages 
ADD COLUMN IF NOT EXISTS paid boolean DEFAULT false NOT NULL;

-- Add index on paid for analytics queries
CREATE INDEX IF NOT EXISTS idx_messages_paid ON generated_messages(paid);

-- Add index on template_url for template usage analytics
CREATE INDEX IF NOT EXISTS idx_messages_template_url ON generated_messages(template_url) WHERE template_url IS NOT NULL;

