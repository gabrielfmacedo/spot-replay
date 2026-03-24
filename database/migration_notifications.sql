-- ============================================================
-- SPOT REPLAY — Sistema de Notificações
-- Executar no Supabase SQL Editor
-- ============================================================

-- ── Tables ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_templates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  body                text NOT NULL,
  link_url            text,
  link_label          text,
  type                text NOT NULL DEFAULT 'broadcast' CHECK (type IN ('broadcast', 'drip')),
  drip_delay_minutes  int,                  -- NULL for broadcast; minutes after profile created_at for drip
  segment             text NOT NULL DEFAULT 'all',
  -- segments: 'all' | 'mtt' | 'cash' | 'spingo' | 'sng' | 'team' | 'no_team'
  created_by          uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          timestamptz DEFAULT now(),
  is_active           boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS user_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id uuid REFERENCES notification_templates(id) ON DELETE SET NULL,
  title       text NOT NULL,
  body        text NOT NULL,
  link_url    text,
  link_label  text,
  read_at     timestamptz,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifs_user ON user_notifications(user_id, created_at DESC);

-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_templates_all"   ON notification_templates;
CREATE POLICY "admin_templates_all" ON notification_templates FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "user_own_notifs_select" ON user_notifications;
CREATE POLICY "user_own_notifs_select" ON user_notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_own_notifs_update" ON user_notifications;
CREATE POLICY "user_own_notifs_update" ON user_notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "system_notifs_insert" ON user_notifications;
CREATE POLICY "system_notifs_insert" ON user_notifications FOR INSERT WITH CHECK (true);

-- ── Helper: segment filter ───────────────────────────────────

CREATE OR REPLACE FUNCTION notif_segment_matches(p profiles, seg text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT CASE seg
    WHEN 'all'     THEN true
    WHEN 'mtt'     THEN p.modality = 'MTT'
    WHEN 'cash'    THEN p.modality = 'CASH'
    WHEN 'spingo'  THEN p.modality = 'SPINGO'
    WHEN 'sng'     THEN p.modality = 'SNG'
    WHEN 'team'    THEN p.plays_for_team = true
    WHEN 'no_team' THEN coalesce(p.plays_for_team, false) = false
    ELSE true
  END
$$;

-- ── admin_send_broadcast ────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_send_broadcast(
  p_title       text,
  p_body        text,
  p_link_url    text,
  p_link_label  text,
  p_segment     text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  tmpl_id        uuid;
  recipient_count int;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  INSERT INTO notification_templates(title, body, link_url, link_label, type, segment, created_by, is_active)
  VALUES (p_title, p_body, p_link_url, p_link_label, 'broadcast', p_segment, auth.uid(), true)
  RETURNING id INTO tmpl_id;

  INSERT INTO user_notifications(user_id, template_id, title, body, link_url, link_label)
  SELECT p.id, tmpl_id, p_title, p_body, p_link_url, p_link_label
  FROM profiles p
  WHERE notif_segment_matches(p, p_segment);

  GET DIAGNOSTICS recipient_count = ROW_COUNT;
  RETURN jsonb_build_object('template_id', tmpl_id, 'recipients', recipient_count);
END;
$$;

-- ── admin_save_drip ────────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_save_drip(
  p_title          text,
  p_body           text,
  p_link_url       text,
  p_link_label     text,
  p_segment        text,
  p_delay_minutes  int
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE tmpl_id uuid;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  INSERT INTO notification_templates(title, body, link_url, link_label, type, drip_delay_minutes, segment, created_by, is_active)
  VALUES (p_title, p_body, p_link_url, p_link_label, 'drip', p_delay_minutes, p_segment, auth.uid(), true)
  RETURNING id INTO tmpl_id;
  RETURN tmpl_id;
END;
$$;

-- ── admin_toggle_notif ────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_toggle_notif(p_id uuid, p_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE notification_templates SET is_active = p_active WHERE id = p_id;
END;
$$;

-- ── admin_delete_notif ────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_delete_notif(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM notification_templates WHERE id = p_id;
END;
$$;

-- ── admin_get_notif_templates ──────────────────────────────

CREATE OR REPLACE FUNCTION admin_get_notif_templates()
RETURNS TABLE (
  id                  uuid,
  title               text,
  body                text,
  link_url            text,
  link_label          text,
  type                text,
  drip_delay_minutes  int,
  segment             text,
  is_active           boolean,
  created_at          timestamptz,
  delivered_count     bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY
    SELECT
      t.id, t.title, t.body, t.link_url, t.link_label,
      t.type, t.drip_delay_minutes, t.segment, t.is_active, t.created_at,
      count(n.id) AS delivered_count
    FROM notification_templates t
    LEFT JOIN user_notifications n ON n.template_id = t.id
    GROUP BY t.id
    ORDER BY t.created_at DESC;
END;
$$;

-- ── check_drip_notifications ──────────────────────────────
-- Called client-side on login; delivers pending drip notifs for current user

CREATE OR REPLACE FUNCTION check_drip_notifications()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  tmpl      notification_templates%ROWTYPE;
  prof      profiles%ROWTYPE;
  delivered int := 0;
BEGIN
  SELECT * INTO prof FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN 0; END IF;

  FOR tmpl IN
    SELECT * FROM notification_templates
    WHERE type = 'drip'
      AND is_active = true
      AND (now() - prof.created_at) >= (drip_delay_minutes * interval '1 minute')
      AND id NOT IN (
        SELECT template_id FROM user_notifications
        WHERE user_id = auth.uid() AND template_id IS NOT NULL
      )
  LOOP
    IF notif_segment_matches(prof, tmpl.segment) THEN
      INSERT INTO user_notifications(user_id, template_id, title, body, link_url, link_label)
      VALUES (auth.uid(), tmpl.id, tmpl.title, tmpl.body, tmpl.link_url, tmpl.link_label);
      delivered := delivered + 1;
    END IF;
  END LOOP;
  RETURN delivered;
END;
$$;

-- ── Permissions ──────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION admin_send_broadcast(text, text, text, text, text)       TO authenticated;
GRANT EXECUTE ON FUNCTION admin_save_drip(text, text, text, text, text, int)       TO authenticated;
GRANT EXECUTE ON FUNCTION admin_toggle_notif(uuid, boolean)                         TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_notif(uuid)                                  TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_notif_templates()                               TO authenticated;
GRANT EXECUTE ON FUNCTION check_drip_notifications()                                TO authenticated;
GRANT EXECUTE ON FUNCTION notif_segment_matches(profiles, text)                     TO authenticated;
