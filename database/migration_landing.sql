-- ─── Leads table for email marketing integration ─────────────────────────────
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name   text NOT NULL,
  email       text NOT NULL,
  whatsapp    text,
  source      text NOT NULL DEFAULT 'landing',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (unauthenticated user during signup)
CREATE POLICY "Public insert leads"
  ON public.leads FOR INSERT
  WITH CHECK (true);

-- Users can read only their own lead
CREATE POLICY "Users read own lead"
  ON public.leads FOR SELECT
  USING (auth.uid() = user_id);

-- Auto-insert lead when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.leads (user_id, full_name, email, whatsapp, source)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'source', 'landing')
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_lead ON auth.users;
CREATE TRIGGER on_auth_user_created_lead
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_lead();
