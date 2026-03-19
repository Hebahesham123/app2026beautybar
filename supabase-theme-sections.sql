-- Run in Supabase Dashboard → SQL Editor
-- Adds home_sections_json to theme_settings for the Theme Editor (home page sections).

-- If theme_settings doesn't exist yet, create it with common columns
CREATE TABLE IF NOT EXISTS theme_settings (
  id TEXT PRIMARY KEY DEFAULT '1',
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  background_color TEXT,
  text_color TEXT,
  radius TEXT,
  promo_text TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_image_url TEXT,
  home_blocks_json TEXT,
  nav_json TEXT,
  updated_at TIMESTAMPTZ
);

-- Add home_sections_json for section-based home page (Theme Editor)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'theme_settings' AND column_name = 'home_sections_json'
  ) THEN
    ALTER TABLE theme_settings ADD COLUMN home_sections_json TEXT;
  END IF;
END $$;

-- Footer content (Theme Editor → Footer tab)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'theme_settings' AND column_name = 'footer_json'
  ) THEN
    ALTER TABLE theme_settings ADD COLUMN footer_json TEXT;
  END IF;
END $$;
