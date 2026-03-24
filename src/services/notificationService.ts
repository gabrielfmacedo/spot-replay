import { supabase } from './supabase';

export interface UserNotification {
  id: string;
  template_id: string | null;
  title: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotifTemplate {
  id: string;
  title: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
  type: 'broadcast' | 'drip';
  drip_delay_minutes: number | null;
  segment: string;
  is_active: boolean;
  created_at: string;
  delivered_count: number;
}

function db() {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
}

// ── User-facing ────────────────────────────────────────────────────────────────

export async function getMyNotifications(): Promise<UserNotification[]> {
  const { data, error } = await db()
    .from('user_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []) as UserNotification[];
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await db()
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', ids)
    .is('read_at', null);
}

export async function markAllRead(userId: string): Promise<void> {
  await db()
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
}

export async function checkDripNotifications(): Promise<void> {
  await Promise.resolve(db().rpc('check_drip_notifications'));
}

export function subscribeToMyNotifications(
  userId: string,
  onNew: (n: UserNotification) => void,
) {
  const client = db();
  return client
    .channel(`notifs:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${userId}`,
      },
      payload => onNew(payload.new as UserNotification),
    )
    .subscribe();
}

// ── Admin ──────────────────────────────────────────────────────────────────────

export async function adminGetTemplates(): Promise<NotifTemplate[]> {
  const { data, error } = await db().rpc('admin_get_notif_templates');
  if (error) throw error;
  return (data ?? []) as NotifTemplate[];
}

export async function adminSendBroadcast(
  title: string,
  body: string,
  linkUrl: string,
  linkLabel: string,
  segment: string,
): Promise<{ recipients: number }> {
  const { data, error } = await db().rpc('admin_send_broadcast', {
    p_title: title,
    p_body: body,
    p_link_url: linkUrl || null,
    p_link_label: linkLabel || null,
    p_segment: segment,
  });
  if (error) throw error;
  return data as { recipients: number };
}

export async function adminSaveDrip(
  title: string,
  body: string,
  linkUrl: string,
  linkLabel: string,
  segment: string,
  delayMinutes: number,
): Promise<void> {
  const { error } = await db().rpc('admin_save_drip', {
    p_title: title,
    p_body: body,
    p_link_url: linkUrl || null,
    p_link_label: linkLabel || null,
    p_segment: segment,
    p_delay_minutes: delayMinutes,
  });
  if (error) throw error;
}

export async function adminToggleNotif(id: string, active: boolean): Promise<void> {
  const { error } = await db().rpc('admin_toggle_notif', { p_id: id, p_active: active });
  if (error) throw error;
}

export async function adminDeleteNotif(id: string): Promise<void> {
  const { error } = await db().rpc('admin_delete_notif', { p_id: id });
  if (error) throw error;
}
