-- ============================================================
-- COACH V3 — Novo fluxo: convite pessoal → aluno envia HH
--            → coach anota → finaliza → aluno confirma
-- ============================================================

-- 1. Token de convite do coach (um por coach, regenerável)
CREATE TABLE IF NOT EXISTS coach_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  token      uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coach_invites ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ler pelo token (necessário para aceitar convite sem saber o coach_id)
CREATE POLICY "coach_invites_select"
  ON coach_invites FOR SELECT USING (true);

CREATE POLICY "coach_invites_insert"
  ON coach_invites FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "coach_invites_update"
  ON coach_invites FOR UPDATE USING (auth.uid() = coach_id);

CREATE POLICY "coach_invites_delete"
  ON coach_invites FOR DELETE USING (auth.uid() = coach_id);

-- 2. Relacionamento coach ↔ aluno
CREATE TABLE IF NOT EXISTS coach_students (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coach_id, student_id)
);

ALTER TABLE coach_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_students_select"
  ON coach_students FOR SELECT
  USING (auth.uid() = coach_id OR auth.uid() = student_id);

CREATE POLICY "coach_students_insert"
  ON coach_students FOR INSERT
  WITH CHECK (auth.uid() = student_id);   -- aluno aceita o convite = cria relacionamento

CREATE POLICY "coach_students_delete"
  ON coach_students FOR DELETE
  USING (auth.uid() = coach_id OR auth.uid() = student_id);

-- 3. Sessões de revisão (aluno envia HH ao coach)
CREATE TABLE IF NOT EXISTS review_sessions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coach_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name                 text NOT NULL DEFAULT '',
  hands_json           jsonb NOT NULL DEFAULT '[]'::jsonb,
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','annotating','done','confirmed')),
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  finalized_at         timestamptz,
  student_confirmed_at timestamptz
);

ALTER TABLE review_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_sessions_select"
  ON review_sessions FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = coach_id);

CREATE POLICY "review_sessions_insert"
  ON review_sessions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "review_sessions_update"
  ON review_sessions FOR UPDATE
  USING (auth.uid() = student_id OR auth.uid() = coach_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_review_sessions_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_review_sessions_ts ON review_sessions;
CREATE TRIGGER trg_review_sessions_ts
  BEFORE UPDATE ON review_sessions
  FOR EACH ROW EXECUTE FUNCTION update_review_sessions_ts();

-- 4. Anotações de revisão (tabela separada, evita RLS recursivo de hand_annotations)
CREATE TABLE IF NOT EXISTS review_annotations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_session_id uuid REFERENCES review_sessions(id) ON DELETE CASCADE NOT NULL,
  hand_key          text NOT NULL,
  author_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name       text NOT NULL DEFAULT '',
  author_role       text NOT NULL DEFAULT 'coach',
  text              text NOT NULL DEFAULT '',
  tags              text[] NOT NULL DEFAULT '{}',
  starred           boolean NOT NULL DEFAULT false,
  street            text NOT NULL DEFAULT 'GENERAL',
  severity          text NOT NULL DEFAULT 'info'
                      CHECK (severity IN ('info','warning','critical')),
  step_index        integer,
  study_links       jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at        timestamptz DEFAULT now(),
  UNIQUE(review_session_id, hand_key, author_id, street)
);

ALTER TABLE review_annotations ENABLE ROW LEVEL SECURITY;

-- Acesso simples: coach ou student da sessão (sem subquery circular)
CREATE POLICY "review_annotations_select"
  ON review_annotations FOR SELECT
  USING (
    review_session_id IN (
      SELECT id FROM review_sessions
      WHERE coach_id = auth.uid() OR student_id = auth.uid()
    )
  );

CREATE POLICY "review_annotations_insert"
  ON review_annotations FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    review_session_id IN (
      SELECT id FROM review_sessions
      WHERE coach_id = auth.uid() OR student_id = auth.uid()
    )
  );

CREATE POLICY "review_annotations_update"
  ON review_annotations FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "review_annotations_delete"
  ON review_annotations FOR DELETE
  USING (auth.uid() = author_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_review_annotations_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_review_annotations_ts ON review_annotations;
CREATE TRIGGER trg_review_annotations_ts
  BEFORE UPDATE ON review_annotations
  FOR EACH ROW EXECUTE FUNCTION update_review_annotations_ts();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE review_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE review_annotations;
