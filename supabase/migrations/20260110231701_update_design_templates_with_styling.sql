/*
  # Update Design Templates with Styling Fields

  1. Changes
    - Add `thumbnail_url` for preview in selector
    - Add `preview_gradient` for CSS gradient classes
    - Add `border_color` for CSS border classes
    - Add `accent_color` for CSS accent color classes
    - Add `display_order` for sorting templates

  2. Storage
    - Ensure storage bucket exists and has proper policies

  3. Data
    - Insert default templates if they don't exist
*/

-- Add new columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'design_templates' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE design_templates ADD COLUMN thumbnail_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'design_templates' AND column_name = 'preview_gradient'
  ) THEN
    ALTER TABLE design_templates ADD COLUMN preview_gradient text DEFAULT 'bg-gradient-to-br from-pink-50 to-red-50';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'design_templates' AND column_name = 'border_color'
  ) THEN
    ALTER TABLE design_templates ADD COLUMN border_color text DEFAULT 'border-red-200';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'design_templates' AND column_name = 'accent_color'
  ) THEN
    ALTER TABLE design_templates ADD COLUMN accent_color text DEFAULT 'text-red-600';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'design_templates' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE design_templates ADD COLUMN display_order integer DEFAULT 0;
  END IF;
END $$;

-- Create storage bucket for template images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('design-templates', 'design-templates', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public can view template images" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can upload template images" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can update template images" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete template images" ON storage.objects;
END $$;

-- Storage policies for template images
CREATE POLICY "Public can view template images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'design-templates');

CREATE POLICY "Admins can upload template images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'design-templates' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update template images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'design-templates' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete template images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'design-templates' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Update RLS policies for design_templates table
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can view active templates" ON design_templates;
  DROP POLICY IF EXISTS "Admins can view all templates" ON design_templates;
  DROP POLICY IF EXISTS "Admins can insert templates" ON design_templates;
  DROP POLICY IF EXISTS "Admins can update templates" ON design_templates;
  DROP POLICY IF EXISTS "Admins can delete templates" ON design_templates;
END $$;

-- Public can view active templates
CREATE POLICY "Anyone can view active templates"
  ON design_templates
  FOR SELECT
  TO public
  USING (is_active = true);

-- Admins can view all templates
CREATE POLICY "Admins can view all templates"
  ON design_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can insert templates
CREATE POLICY "Admins can insert templates"
  ON design_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can update templates
CREATE POLICY "Admins can update templates"
  ON design_templates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can delete templates
CREATE POLICY "Admins can delete templates"
  ON design_templates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Insert default templates if table is empty
INSERT INTO design_templates (name, description, category, preview_gradient, border_color, accent_color, display_order, is_active, image_url, storage_path)
SELECT 'Romantic Hearts', 'Classic pink and red gradient perfect for love letters', 'love_letter', 'bg-gradient-to-br from-pink-50 to-red-50', 'border-red-200', 'text-red-600', 1, true, '', ''
WHERE NOT EXISTS (SELECT 1 FROM design_templates WHERE name = 'Romantic Hearts');

INSERT INTO design_templates (name, description, category, preview_gradient, border_color, accent_color, display_order, is_active, image_url, storage_path)
SELECT 'Elegant Gold', 'Sophisticated gold gradient for special occasions', 'love_letter', 'bg-gradient-to-br from-amber-50 to-yellow-50', 'border-amber-300', 'text-amber-700', 2, true, '', ''
WHERE NOT EXISTS (SELECT 1 FROM design_templates WHERE name = 'Elegant Gold');

INSERT INTO design_templates (name, description, category, preview_gradient, border_color, accent_color, display_order, is_active, image_url, storage_path)
SELECT 'Modern Minimal', 'Clean and contemporary gray tones', 'general', 'bg-gradient-to-br from-gray-50 to-slate-100', 'border-gray-300', 'text-gray-700', 3, true, '', ''
WHERE NOT EXISTS (SELECT 1 FROM design_templates WHERE name = 'Modern Minimal');

INSERT INTO design_templates (name, description, category, preview_gradient, border_color, accent_color, display_order, is_active, image_url, storage_path)
SELECT 'Floral Spring', 'Fresh green gradient with spring vibes', 'gift_card', 'bg-gradient-to-br from-green-50 to-emerald-50', 'border-green-300', 'text-green-700', 4, true, '', ''
WHERE NOT EXISTS (SELECT 1 FROM design_templates WHERE name = 'Floral Spring');
