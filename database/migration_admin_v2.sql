-- ============================================================
-- SPOT REPLAY — Admin v2: metrics + last_seen + leads access
-- Executar no Supabase SQL Editor
-- ============================================================

-- ── 1. last_seen_at na tabela profiles ──────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- ── 2. Atualizar admin_get_users para incluir last_sign_in_at ─
DROP FUNCTION IF EXISTS admin_get_users();
CREATE OR REPLACE FUNCTION admin_get_users()
RETURNS TABLE (
  id              uuid,
  email           text,
  full_name       text,
  role            text,
  whatsapp        text,
  created_at      timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY
    SELECT
      p.id, p.email, p.full_name, p.role,
      l.whatsapp, p.created_at,
      u.last_sign_in_at
    FROM profiles p
    LEFT JOIN leads l        ON l.user_id = p.id
    LEFT JOIN auth.users u   ON u.id = p.id
    ORDER BY p.created_at DESC;
END;
$$;

-- ── 3. Função admin_get_leads ─────────────────────────────────
CREATE OR REPLACE FUNCTION admin_get_leads()
RETURNS TABLE (
  id          uuid,
  full_name   text,
  email       text,
  whatsapp    text,
  source      text,
  created_at  timestamptz,
  has_account boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY
    SELECT
      l.id, l.full_name, l.email, l.whatsapp, l.source, l.created_at,
      (l.user_id IS NOT NULL) AS has_account
    FROM leads l
    ORDER BY l.created_at DESC;
END;
$$;

-- ── 4. Função admin_get_metrics ───────────────────────────────
CREATE OR REPLACE FUNCTION admin_get_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT jsonb_build_object(
    'total_users',   (SELECT count(*)::int FROM profiles),
    'new_7d',        (SELECT count(*)::int FROM profiles WHERE created_at > now() - interval '7 days'),
    'new_30d',       (SELECT count(*)::int FROM profiles WHERE created_at > now() - interval '30 days'),
    'active_today',  (SELECT count(*)::int FROM auth.users WHERE last_sign_in_at::date = current_date),
    'active_7d',     (SELECT count(*)::int FROM auth.users WHERE last_sign_in_at > now() - interval '7 days'),
    'total_leads',   (SELECT count(*)::int FROM leads),
    'leads_7d',      (SELECT count(*)::int FROM leads WHERE created_at > now() - interval '7 days'),
    'shared_hands',  (SELECT count(*)::int FROM shared_hands),
    'online_now',    (SELECT count(*)::int FROM profiles WHERE last_seen_at > now() - interval '5 minutes')
  ) INTO result;
  RETURN result;
END;
$$;

-- ── 5. Permissões ─────────────────────────────────────────────
REVOKE ALL ON FUNCTION admin_get_leads()   FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_get_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_users()   TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_leads()   TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_metrics() TO authenticated;
