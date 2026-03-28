-- ============================================================================
-- IPL Picks 2026 — Schema Migration v3
-- Adds: reserved_names table to prevent display name impersonation
-- ============================================================================

CREATE TABLE IF NOT EXISTS reserved_names (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_lower TEXT NOT NULL,
  originally_used_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_reserved_names_lower ON reserved_names (name_lower);

-- RLS
ALTER TABLE reserved_names ENABLE ROW LEVEL SECURITY;

-- Only readable via service_role (admin API), no direct user access needed
-- No SELECT policy = users can't query it directly, only our API checks it

-- Seed: reserve all current display names for their owners
INSERT INTO reserved_names (name_lower, originally_used_by)
SELECT LOWER(display_name), id FROM profiles
ON CONFLICT DO NOTHING;
