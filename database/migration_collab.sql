-- ============================================================
-- SPOT REPLAY — Sistema Colaborativo de Análise de Mãos
-- migration_collab.sql
-- Executar no Supabase SQL Editor
-- ============================================================

-- ── Sessões (hand histories enviados para a nuvem) ───────────────────────────
CREATE TABLE IF NOT EXISTS replay_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID REFERENCES auth.users NOT NULL,
  owner_email TEXT,
  name        TEXT NOT NULL DEFAULT 'Sessão sem nome',
  room        TEXT,
  hands_json  JSONB NOT NULL DEFAULT '[]',
  hand_count  INTEGER GENERATED ALWAYS AS (jsonb_array_length(hands_json)) STORED,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Membros de uma sessão (compartilhamento) ─────────────────────────────────
-- role: 'coach' pode anotar e convidar | 'student' só lê anotações dos outros
CREATE TABLE IF NOT EXISTS session_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID REFERENCES replay_sessions ON DELETE CASCADE NOT NULL,
  user_id       UUID REFERENCES auth.users,
  email         TEXT,                         -- para convites pendentes
  role          TEXT NOT NULL DEFAULT 'student', -- 'coach' | 'student'
  can_annotate  BOOLEAN NOT NULL DEFAULT TRUE,
  status        TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted'
  invited_at    TIMESTAMPTZ DEFAULT NOW(),
  joined_at     TIMESTAMPTZ
);

-- ── Anotações por mão ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hand_annotations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID REFERENCES replay_sessions ON DELETE CASCADE NOT NULL,
  hand_key     TEXT NOT NULL,     -- formato: '{room}_{handId}'
  author_id    UUID REFERENCES auth.users NOT NULL,
  author_name  TEXT NOT NULL,
  author_role  TEXT NOT NULL DEFAULT 'student', -- 'coach' | 'student'
  text         TEXT NOT NULL DEFAULT '',
  tags         TEXT[] NOT NULL DEFAULT '{}',
  starred      BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, hand_key, author_id)
);

-- ── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sessions_owner       ON replay_sessions (owner_id);
CREATE INDEX IF NOT EXISTS idx_members_session      ON session_members (session_id);
CREATE INDEX IF NOT EXISTS idx_members_user         ON session_members (user_id);
CREATE INDEX IF NOT EXISTS idx_members_email        ON session_members (email);
CREATE INDEX IF NOT EXISTS idx_annotations_session  ON hand_annotations (session_id);
CREATE INDEX IF NOT EXISTS idx_annotations_hand_key ON hand_annotations (session_id, hand_key);

-- ── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON replay_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_annotations_updated_at
  BEFORE UPDATE ON hand_annotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE replay_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hand_annotations  ENABLE ROW LEVEL SECURITY;

-- Sessions: owner pode tudo; membros aceitos podem ler
CREATE POLICY "sessions_owner_all" ON replay_sessions
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "sessions_member_select" ON replay_sessions
  FOR SELECT USING (
    id IN (
      SELECT session_id FROM session_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Members: owner da sessão vê e gerencia todos os membros
CREATE POLICY "members_owner_all" ON session_members
  FOR ALL USING (
    session_id IN (
      SELECT id FROM replay_sessions WHERE owner_id = auth.uid()
    )
  );

-- Members: cada usuário vê suas próprias linhas (para aceitar convite)
CREATE POLICY "members_self_select" ON session_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "members_self_update" ON session_members
  FOR UPDATE USING (user_id = auth.uid());

-- Annotations: membros aceitos podem ler todas da sessão
CREATE POLICY "annotations_member_select" ON hand_annotations
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM replay_sessions WHERE owner_id = auth.uid()
      UNION
      SELECT session_id FROM session_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Annotations: membros com can_annotate podem inserir/atualizar as próprias
CREATE POLICY "annotations_member_write" ON hand_annotations
  FOR ALL USING (
    author_id = auth.uid()
    AND session_id IN (
      SELECT id FROM replay_sessions WHERE owner_id = auth.uid()
      UNION
      SELECT session_id FROM session_members
      WHERE user_id = auth.uid() AND status = 'accepted' AND can_annotate = TRUE
    )
  );

-- ── Realtime ─────────────────────────────────────────────────────────────────
-- Habilitar Realtime para sync ao vivo de anotações
ALTER PUBLICATION supabase_realtime ADD TABLE hand_annotations;
ALTER PUBLICATION supabase_realtime ADD TABLE session_members;
