-- ============================================================
-- SPOT REPLAY — Profile extra fields
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS modality  TEXT CHECK (modality IN ('MTT', 'CASH', 'SPINGO', 'SNG')),
  ADD COLUMN IF NOT EXISTS plays_for_team BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS team_name TEXT,
  ADD COLUMN IF NOT EXISTS poker_nick TEXT;

-- RLS: user can update own profile extras
DROP POLICY IF EXISTS "user_update_own_profile" ON profiles;
CREATE POLICY "user_update_own_profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
