-- ============================================================================
-- IPL Picks 2026 — Schema Migration v2
-- Run this in Supabase SQL Editor (safe to re-run)
-- Adds: is_approved on profiles, app_settings table, prizes
-- ============================================================================

-- 1. Add is_approved column to profiles (default false — new users need admin approval)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

-- 2. Auto-approve the existing admin user
UPDATE profiles SET is_approved = TRUE WHERE is_admin = TRUE;

-- 3. App Settings table (for prize amounts etc.)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'settings_select_authenticated' AND tablename = 'app_settings'
  ) THEN
    CREATE POLICY "settings_select_authenticated"
      ON app_settings FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 4. Seed default prize values
INSERT INTO app_settings (key, value)
VALUES ('prizes', '{"first": 100, "second": 50, "third": 25, "streak": 25}')
ON CONFLICT (key) DO NOTHING;

-- 5. Update the handle_new_user trigger to set is_approved = false by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, is_approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
