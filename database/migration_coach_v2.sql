-- ──────────────────────────────────────────────────────────────────────────────
-- COACH V2 MIGRATION
-- Adds study_links to hand_annotations and reviewed_at to replay_sessions
-- Run in Supabase SQL Editor
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Add study_links column to hand_annotations
-- Stores array of { url, label } objects suggested by the coach per hand
ALTER TABLE hand_annotations
  ADD COLUMN IF NOT EXISTS study_links jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Add reviewed_at to replay_sessions
-- Set by the coach when they finalize the review; null = not reviewed yet
ALTER TABLE replay_sessions
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz DEFAULT NULL;

-- 3. Index for quick lookup of reviewed sessions (used by student dashboard)
CREATE INDEX IF NOT EXISTS idx_replay_sessions_reviewed_at
  ON replay_sessions (reviewed_at)
  WHERE reviewed_at IS NOT NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- DONE
-- ──────────────────────────────────────────────────────────────────────────────
