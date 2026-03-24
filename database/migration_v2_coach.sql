-- ============================================================
-- SPOT REPLAY — Migration v2: Coach Notes
-- Executar no Supabase SQL Editor APÓS migration_collab.sql
-- ============================================================

-- ── Profiles (auto-criado no signup, usado para lookup por e-mail) ────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email      TEXT,
  full_name  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cada usuário gerencia o próprio perfil
CREATE POLICY "profiles_self_all" ON profiles
  FOR ALL USING (id = auth.uid());

-- Todos podem ler e-mails para o sistema de convites
CREATE POLICY "profiles_read_email" ON profiles
  FOR SELECT USING (true);

-- Trigger: cria perfil automaticamente quando usuário se cadastra
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── hand_annotations: adicionar contexto de coach ─────────────────────────────
-- street: qual rua a anotação se refere (GENERAL = anotação geral da mão)
-- severity: nível de importância para o aluno
-- step_index: step exato do replay (para pin preciso no momento da decisão)
ALTER TABLE hand_annotations
  ADD COLUMN IF NOT EXISTS street    TEXT    NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS severity  TEXT    NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS step_index INTEGER;

-- Constraint: 1 anotação por autor por mão por street
-- (remove a constraint antiga e cria a nova)
ALTER TABLE hand_annotations DROP CONSTRAINT IF EXISTS hand_annotations_session_id_hand_key_author_id_key;
ALTER TABLE hand_annotations ADD CONSTRAINT hand_annotations_unique
  UNIQUE (session_id, hand_key, author_id, street);

-- Habilitar realtime para profiles também
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
