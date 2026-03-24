-- ============================================================
-- SPOT REPLAY — Shared Hands (public share links)
-- Executar no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shared_hands (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text,
  hand_json   jsonb NOT NULL,
  raw_text    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_hands ENABLE ROW LEVEL SECURITY;

-- Owner manages their shared hands
CREATE POLICY "owner_shared_hands" ON public.shared_hands
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anyone (even anon) can read to open a shared link
CREATE POLICY "public_read_shared_hands" ON public.shared_hands
  FOR SELECT USING (true);
