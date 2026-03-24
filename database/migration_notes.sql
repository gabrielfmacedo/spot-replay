-- ─── Hand Notes ────────────────────────────────────────────────────────────
-- Persists per-hand annotations (starred, text, tags) per user
CREATE TABLE IF NOT EXISTS hand_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hand_key    text NOT NULL,
  starred     boolean NOT NULL DEFAULT false,
  text        text NOT NULL DEFAULT '',
  tags        text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, hand_key)
);

ALTER TABLE hand_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own hand notes"
  ON hand_notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Player Notes ───────────────────────────────────────────────────────────
-- Villain book: notes on specific players by username
CREATE TABLE IF NOT EXISTS player_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name  text NOT NULL,
  note         text NOT NULL DEFAULT '',
  label        text,          -- e.g. 'Fish', 'Reg', 'Nit', 'LAG'
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, player_name)
);

ALTER TABLE player_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own player notes"
  ON player_notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER hand_notes_updated_at
  BEFORE UPDATE ON hand_notes
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER player_notes_updated_at
  BEFORE UPDATE ON player_notes
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
