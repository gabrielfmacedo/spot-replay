
import { supabase } from './supabase';
import { HandHistory, ReplaySession, SessionMember, HandAnnotation, HandNote, StudyLink } from '../types';
import type { PlayerNoteData } from '../components/PlayerNoteModal';
import { migratePlayerNote } from '../components/PlayerNoteModal';

function db() {
  if (!supabase) throw new Error('Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  return supabase;
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function createSession(
  hands: HandHistory[],
  name: string
): Promise<ReplaySession> {
  const client = db();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');

  const { data, error } = await client
    .from('replay_sessions')
    .insert({
      owner_id: user.id,
      owner_email: user.email ?? '',
      name,
      room: hands[0]?.room ?? null,
      hands_json: hands,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ReplaySession;
}

export async function getMySessions(): Promise<ReplaySession[]> {
  const { data, error } = await db()
    .from('replay_sessions')
    .select('id, owner_id, owner_email, name, room, hand_count, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ReplaySession[];
}

export async function getSharedSessions(): Promise<(ReplaySession & { my_role: string })[]> {
  const client = db();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return [];

  const { data: members, error: me } = await client
    .from('session_members')
    .select('session_id, role')
    .eq('user_id', user.id)
    .eq('status', 'accepted');

  if (me || !members?.length) return [];

  const ids = members.map(m => m.session_id);
  const { data: sessions, error } = await client
    .from('replay_sessions')
    .select('id, owner_id, owner_email, name, room, hand_count, created_at, updated_at, reviewed_at')
    .in('id', ids)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (sessions ?? []).map(s => ({
    ...(s as ReplaySession),
    my_role: members.find(m => m.session_id === s.id)?.role ?? 'student',
  }));
}

export async function getPendingInvites(): Promise<(SessionMember & { session_name: string; owner_email: string })[]> {
  const client = db();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return [];

  const { data, error } = await client
    .from('session_members')
    .select('*, replay_sessions(name, owner_email)')
    .eq('user_id', user.id)
    .eq('status', 'pending');

  if (error) return [];
  return (data ?? []).map((m: any) => ({
    ...m,
    session_name: m.replay_sessions?.name ?? '—',
    owner_email: m.replay_sessions?.owner_email ?? '—',
  }));
}

export async function loadSessionHands(sessionId: string): Promise<HandHistory[]> {
  const { data, error } = await db()
    .from('replay_sessions')
    .select('hands_json')
    .eq('id', sessionId)
    .single();

  if (error) throw error;
  return (data?.hands_json ?? []) as HandHistory[];
}

export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await db()
    .from('replay_sessions')
    .delete()
    .eq('id', sessionId);
  if (error) throw error;
}

// ── Members ───────────────────────────────────────────────────────────────────

export async function getSessionMembers(sessionId: string): Promise<SessionMember[]> {
  const { data, error } = await db()
    .from('session_members')
    .select('*')
    .eq('session_id', sessionId)
    .order('invited_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as SessionMember[];
}

export async function inviteMember(
  sessionId: string,
  email: string,
  role: 'coach' | 'student',
  canAnnotate: boolean
): Promise<void> {
  const client = db();

  // Check if already a member
  const { data: existing } = await client
    .from('session_members')
    .select('id')
    .eq('session_id', sessionId)
    .eq('email', email)
    .maybeSingle();

  if (existing) throw new Error('Este e-mail já foi convidado.');

  // Try to find user by email to link user_id immediately
  let profileId: string | null = null;
  try {
    const { data: profile } = await client
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    profileId = profile?.id ?? null;
  } catch { /* user not found, invite without user_id */ }

  const { error } = await client
    .from('session_members')
    .insert({
      session_id: sessionId,
      email,
      user_id: profileId,
      role,
      can_annotate: canAnnotate,
      status: 'pending',
    });

  if (error) throw error;
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await db()
    .from('session_members')
    .delete()
    .eq('id', memberId);
  if (error) throw error;
}

export async function acceptInvite(sessionId: string): Promise<void> {
  const client = db();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');

  // Find member row by email OR user_id
  const { data: member } = await client
    .from('session_members')
    .select('id')
    .eq('session_id', sessionId)
    .or(`email.eq.${user.email},user_id.eq.${user.id}`)
    .maybeSingle();

  if (!member) throw new Error('Convite não encontrado.');

  const { error } = await client
    .from('session_members')
    .update({ status: 'accepted', user_id: user.id, joined_at: new Date().toISOString() })
    .eq('id', member.id);

  if (error) throw error;
}

// ── Annotations ───────────────────────────────────────────────────────────────

export async function getAnnotations(sessionId: string): Promise<HandAnnotation[]> {
  const { data, error } = await db()
    .from('hand_annotations')
    .select('*')
    .eq('session_id', sessionId)
    .order('updated_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as HandAnnotation[];
}

export async function upsertAnnotation(
  sessionId: string,
  handKey: string,
  payload: {
    text: string;
    tags: string[];
    starred: boolean;
    street?: string;
    severity?: 'info' | 'warning' | 'critical';
    step_index?: number;
    study_links?: StudyLink[];
  },
  authorName: string,
  authorRole: string
): Promise<HandAnnotation> {
  const client = db();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');

  const { data, error } = await client
    .from('hand_annotations')
    .upsert(
      {
        session_id: sessionId,
        hand_key: handKey,
        author_id: user.id,
        author_name: authorName,
        author_role: authorRole,
        text: payload.text,
        tags: payload.tags,
        starred: payload.starred,
        street: payload.street ?? 'GENERAL',
        severity: payload.severity ?? 'info',
        step_index: payload.step_index ?? null,
        study_links: payload.study_links ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,hand_key,author_id,street' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as HandAnnotation;
}

// Carrega TODAS as anotações de uma sessão (para indicadores na sidebar)
export async function getAllSessionAnnotations(sessionId: string): Promise<Record<string, HandAnnotation[]>> {
  const { data, error } = await db()
    .from('hand_annotations')
    .select('*')
    .eq('session_id', sessionId)
    .order('updated_at', { ascending: true });

  if (error) throw error;
  const result: Record<string, HandAnnotation[]> = {};
  for (const ann of (data ?? []) as HandAnnotation[]) {
    if (!result[ann.hand_key]) result[ann.hand_key] = [];
    result[ann.hand_key].push(ann);
  }
  return result;
}

// ── Realtime ──────────────────────────────────────────────────────────────────

export function subscribeToAnnotations(
  sessionId: string,
  onUpsert: (ann: HandAnnotation) => void,
  onDelete: (id: string, handKey: string) => void
) {
  const client = db();
  return client
    .channel(`annotations:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'hand_annotations',
        filter: `session_id=eq.${sessionId}`,
      },
      payload => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as any;
          onDelete(old.id, old.hand_key);
        } else {
          onUpsert(payload.new as HandAnnotation);
        }
      }
    )
    .subscribe();
}

export function unsubscribeChannel(channel: ReturnType<typeof subscribeToAnnotations>) {
  if (supabase && channel) supabase.removeChannel(channel);
}

// ── Coach review finalization ─────────────────────────────────────────────────

export async function finalizeReview(sessionId: string): Promise<void> {
  const { error } = await db()
    .from('replay_sessions')
    .update({ reviewed_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function subscribeToSession(
  sessionId: string,
  onUpdate: (session: Partial<ReplaySession>) => void
) {
  const client = db();
  return client
    .channel(`session:${sessionId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'replay_sessions', filter: `id=eq.${sessionId}` },
      payload => onUpdate(payload.new as Partial<ReplaySession>)
    )
    .subscribe();
}

// ── Hand Notes (per-user, persisted in DB) ────────────────────────────────────

export async function loadHandNotesFromDB(userId: string): Promise<Record<string, HandNote>> {
  const { data } = await db()
    .from('hand_notes')
    .select('hand_key, starred, text, tags')
    .eq('user_id', userId);
  if (!data) return {};
  const result: Record<string, HandNote> = {};
  for (const row of data) {
    result[row.hand_key] = { starred: row.starred, text: row.text, tags: row.tags ?? [] };
  }
  return result;
}

export async function upsertHandNote(userId: string, handKey: string, note: HandNote): Promise<void> {
  await db().from('hand_notes').upsert(
    { user_id: userId, hand_key: handKey, starred: note.starred, text: note.text, tags: note.tags, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,hand_key' }
  );
}

// ── Player Notes (villain book) ───────────────────────────────────────────────

export async function loadPlayerNotesFromDB(userId: string): Promise<Record<string, PlayerNoteData>> {
  const { data } = await db()
    .from('player_notes')
    .select('player_name, note, label')
    .eq('user_id', userId);
  if (!data) return {};
  const result: Record<string, PlayerNoteData> = {};
  for (const row of data) {
    // `note` column may contain: plain text (old) or JSON-stringified entries array (new)
    let parsed: unknown = { note: row.note ?? '', label: row.label ?? '' };
    try {
      const j = JSON.parse(row.note ?? '');
      if (Array.isArray(j)) {
        parsed = { label: row.label ?? '', entries: j };
      }
    } catch { /* plain text — migratePlayerNote handles it */ }
    result[row.player_name] = migratePlayerNote(parsed);
  }
  return result;
}

export async function upsertPlayerNote(userId: string, playerName: string, data: PlayerNoteData): Promise<void> {
  // Store entries as JSON in the `note` column; keep `label` in its own column
  await db().from('player_notes').upsert(
    {
      user_id: userId,
      player_name: playerName,
      note: JSON.stringify(data.entries),
      label: data.label,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,player_name' }
  );
}
