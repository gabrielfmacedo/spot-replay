-- Ideas & Voting system for Spot Replay
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.ideas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Anônimo',
  title       text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 120),
  description text CHECK (char_length(description) <= 1000),
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'planned', 'done', 'rejected')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.idea_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id    uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points     integer NOT NULL CHECK (points BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idea_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS ideas_created_at_idx ON public.ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idea_votes_idea_id_idx ON public.idea_votes(idea_id);

-- Enable RLS
ALTER TABLE public.ideas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_votes ENABLE ROW LEVEL SECURITY;

-- Ideas: anyone (including anon) can read
CREATE POLICY "ideas_read_public" ON public.ideas FOR SELECT USING (true);
-- Ideas: authenticated user can insert their own
CREATE POLICY "ideas_insert" ON public.ideas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Ideas: only the author can update
CREATE POLICY "ideas_update_own" ON public.ideas FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Votes: anyone can read
CREATE POLICY "votes_read_public" ON public.idea_votes FOR SELECT USING (true);
-- Votes: user can insert their own
CREATE POLICY "votes_insert" ON public.idea_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Votes: user can update their own vote
CREATE POLICY "votes_update" ON public.idea_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
-- Votes: user can delete their own vote
CREATE POLICY "votes_delete" ON public.idea_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);
