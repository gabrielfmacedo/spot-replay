-- ============================================================
-- SPOT REPLAY — Migration Admin
-- Executar no Supabase SQL Editor APÓS as outras migrations
-- ============================================================

-- ── 1. Adicionar coluna role na tabela profiles ──────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin'));

-- ── 2. Função is_admin() — SECURITY DEFINER (acessa auth.users sem RLS) ──────
-- Verifica pelo email fixo OU pela coluna role no profiles
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT (
    -- Verificação direta por e-mail no auth.users (funciona mesmo sem profile)
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
        AND email = 'gabrielfmacedo@ymail.com'
    )
    OR
    -- Verificação pela coluna role
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
$$;

-- ── 3. Ajustar trigger handle_new_user: auto-admin para o e-mail especial ────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    CASE WHEN NEW.email = 'gabrielfmacedo@ymail.com' THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO UPDATE
    SET email     = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        role      = CASE WHEN EXCLUDED.email = 'gabrielfmacedo@ymail.com' THEN 'admin' ELSE profiles.role END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Se o usuário admin já existe: promovê-lo agora
UPDATE profiles SET role = 'admin'
WHERE email = 'gabrielfmacedo@ymail.com';

-- ── 4. Políticas RLS — admin acessa tudo em todas as tabelas ─────────────────

-- profiles
DROP POLICY IF EXISTS "admin_profiles_all"      ON profiles;
CREATE POLICY "admin_profiles_all" ON profiles
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- hand_notes
DROP POLICY IF EXISTS "admin_hand_notes_all"    ON hand_notes;
CREATE POLICY "admin_hand_notes_all" ON hand_notes
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- player_notes
DROP POLICY IF EXISTS "admin_player_notes_all"  ON player_notes;
CREATE POLICY "admin_player_notes_all" ON player_notes
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- replay_sessions
DROP POLICY IF EXISTS "admin_sessions_all"      ON replay_sessions;
CREATE POLICY "admin_sessions_all" ON replay_sessions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- session_members
DROP POLICY IF EXISTS "admin_members_all"       ON session_members;
CREATE POLICY "admin_members_all" ON session_members
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- hand_annotations
DROP POLICY IF EXISTS "admin_annotations_all"   ON hand_annotations;
CREATE POLICY "admin_annotations_all" ON hand_annotations
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- leads
DROP POLICY IF EXISTS "admin_leads_all"         ON leads;
CREATE POLICY "admin_leads_all" ON leads
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ── 5. View: admin_users — combina profiles + leads para o painel ─────────────
CREATE OR REPLACE VIEW admin_users_view AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.created_at,
  l.whatsapp
FROM profiles p
LEFT JOIN leads l ON l.user_id = p.id;

-- Apenas admin pode ler a view
ALTER VIEW admin_users_view OWNER TO postgres;
REVOKE ALL ON admin_users_view FROM anon, authenticated;
GRANT SELECT ON admin_users_view TO authenticated;

-- RLS não funciona em views; a proteção real vem das funções abaixo

-- ── 6. Função: admin_get_users — retorna todos os usuários (SECURITY DEFINER) ─
CREATE OR REPLACE FUNCTION admin_get_users()
RETURNS TABLE (
  id          uuid,
  email       text,
  full_name   text,
  role        text,
  whatsapp    text,
  created_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY
    SELECT
      p.id, p.email, p.full_name, p.role,
      l.whatsapp, p.created_at
    FROM profiles p
    LEFT JOIN leads l ON l.user_id = p.id
    ORDER BY p.created_at DESC;
END;
$$;

-- ── 7. Função: admin_update_user ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_update_user(
  p_user_id   uuid,
  p_full_name text,
  p_role      text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_role NOT IN ('user', 'admin') THEN RAISE EXCEPTION 'Invalid role'; END IF;

  UPDATE profiles
  SET full_name = p_full_name,
      role      = p_role
  WHERE id = p_user_id;

  -- Atualiza metadata no auth.users também
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || json_build_object('full_name', p_full_name)::jsonb
  WHERE id = p_user_id;
END;
$$;

-- ── 8. Função: admin_delete_user ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'Não é possível excluir a própria conta'; END IF;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

-- ── 9. Função: admin_create_user ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_create_user(
  p_email     text,
  p_password  text,
  p_full_name text,
  p_phone     text DEFAULT NULL,
  p_role      text DEFAULT 'user'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_uid uuid := gen_random_uuid();
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_role NOT IN ('user', 'admin') THEN RAISE EXCEPTION 'Invalid role'; END IF;

  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    new_uid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    json_build_object('full_name', p_full_name, 'phone', p_phone),
    NOW(), NOW(),
    '', '', '', ''
  );

  -- handle_new_user trigger criará o profile automaticamente,
  -- mas precisamos ajustar o role se for admin
  IF p_role = 'admin' THEN
    UPDATE profiles SET role = 'admin' WHERE id = new_uid;
  END IF;

  RETURN new_uid;
END;
$$;

-- ── 10. Permissões das funções ────────────────────────────────────────────────
REVOKE ALL ON FUNCTION admin_get_users()                                      FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_update_user(uuid, text, text)                    FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_delete_user(uuid)                                FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_create_user(text, text, text, text, text)        FROM PUBLIC;

GRANT EXECUTE ON FUNCTION admin_get_users()                                   TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user(uuid, text, text)                 TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user(uuid)                             TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_user(text, text, text, text, text)     TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin()                                           TO authenticated;
