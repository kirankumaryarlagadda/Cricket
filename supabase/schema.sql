-- ============================================================================
-- IPL Picks 2026 — Complete Database Schema
-- Run this SQL directly in the Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- Profiles: extends Supabase auth.users with app-specific fields
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches: IPL 2026 schedule and results
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_number INTEGER UNIQUE NOT NULL,
  team1 TEXT NOT NULL,
  team2 TEXT NOT NULL,
  venue TEXT NOT NULL,
  match_date TIMESTAMPTZ NOT NULL,
  match_time TEXT NOT NULL DEFAULT '7:30 PM',
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed')),
  winner TEXT,
  stage TEXT NOT NULL DEFAULT 'league' CHECK (stage IN ('league', 'qualifier', 'eliminator', 'final')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Picks: each user's prediction per match (one pick per match, immutable)
CREATE TABLE IF NOT EXISTS picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  picked_team TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);


-- ============================================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks    ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- profiles policies
-- ---------------------------------------------------------------------------

-- Anyone authenticated can read all profiles (needed for leaderboard)
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only insert their own profile
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- matches policies
-- ---------------------------------------------------------------------------

-- Anyone authenticated can read all matches
CREATE POLICY "matches_select_authenticated"
  ON matches FOR SELECT
  TO authenticated
  USING (true);

-- INSERT, UPDATE, DELETE: no user-facing policy.
-- Admin operations use the service_role key which bypasses RLS.

-- ---------------------------------------------------------------------------
-- picks policies
-- ---------------------------------------------------------------------------

-- Users can always read their own picks.
-- Users can also read ANY pick for matches that are no longer 'upcoming'
-- (picks are revealed once the match starts).
CREATE POLICY "picks_select_own_or_revealed"
  ON picks FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = picks.match_id
        AND matches.status != 'upcoming'
    )
  );

-- Users can only insert picks for themselves
CREATE POLICY "picks_insert_own"
  ON picks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- No updates allowed — picks are final
-- (no UPDATE policy = all updates denied under RLS)

-- No deletes allowed — picks are final
-- (no DELETE policy = all deletes denied under RLS)


-- ============================================================================
-- 3. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_picks_user_id        ON picks (user_id);
CREATE INDEX IF NOT EXISTS idx_picks_match_id       ON picks (match_id);
CREATE INDEX IF NOT EXISTS idx_picks_user_match     ON picks (user_id, match_id);
CREATE INDEX IF NOT EXISTS idx_matches_status       ON matches (status);
CREATE INDEX IF NOT EXISTS idx_matches_match_number ON matches (match_number);


-- ============================================================================
-- 4. FUNCTION & TRIGGER: Auto-create profile on signup
-- ============================================================================

-- Function: called after a new row is inserted into auth.users.
-- Extracts display_name from raw_user_meta_data; falls back to the local
-- part of the email address if not provided.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      SPLIT_PART(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fire after every INSERT on auth.users
-- DROP first so re-running the script is safe (CREATE TRIGGER has no IF NOT EXISTS)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();