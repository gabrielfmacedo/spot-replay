import { supabase } from './supabase';
import { HandHistory, ReviewSession, ReviewAnnotation, StudyLink } from '../types';

function db() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

async function currentUser() {
  const { data: { user } } = await db().auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');
  return user;
}

// ── Invite token ───────────────────────────────────────────────────────────────

/** Returns the coach's persistent invite token, creating it if needed. */
export async function getOrCreateInviteToken(): Promise<string> {
  const client = db();
  const user = await currentUser();

  const { data: existing } = await client
    .from('coach_invites')
    .select('token')
    .eq('coach_id', user.id)
    .maybeSingle();

  if (existing) return existing.token as string;

  const { data, error } = await client
    .from('coach_invites')
    .insert({ coach_id: user.id })
    .select('token')
    .single();

  if (error) throw error;
  return data.token as string;
}

/** Regenerates the coach invite token. */
export async function regenerateInviteToken(): Promise<string> {
  const client = db();
  const user = await currentUser();

  const { data, error } = await client
    .from('coach_invites')
    .upsert(
      { coach_id: user.id, token: crypto.randomUUID() },
      { onConflict: 'coach_id' }
    )
    .select('token')
    .single();

  if (error) throw error;
  return data.token as string;
}

// ── Accept invite (student side) ───────────────────────────────────────────────

/** Looks up a coach by token and creates the coach-student relationship. */
export async function acceptCoachInvite(token: string): Promise<{ coachId: string; coachEmail: string }> {
  const client = db();
  const user = await currentUser();

  // Find coach by token
  const { data: invite, error: inviteErr } = await client
    .from('coach_invites')
    .select('coach_id')
    .eq('token', token)
    .maybeSingle();

  if (inviteErr || !invite) throw new Error('Convite inválido ou expirado.');
  if (invite.coach_id === user.id) throw new Error('Você não pode ser seu próprio coach.');

  // Get coach email from profiles
  const { data: profile } = await client
    .from('profiles')
    .select('email')
    .eq('id', invite.coach_id)
    .maybeSingle();

  const coachEmail = profile?.email ?? invite.coach_id;

  // Create relationship (ignore if already exists)
  const { error } = await client
    .from('coach_students')
    .upsert(
      { coach_id: invite.coach_id, student_id: user.id },
      { onConflict: 'coach_id,student_id', ignoreDuplicates: true }
    );

  if (error) throw error;
  return { coachId: invite.coach_id as string, coachEmail: coachEmail as string };
}

// ── Relationships ──────────────────────────────────────────────────────────────

/** Returns the student's current coach (first found). */
export async function getMyCoach(): Promise<{ id: string; email: string } | null> {
  const client = db();
  const user = await currentUser();

  const { data } = await client
    .from('coach_students')
    .select('coach_id, profiles!coach_students_coach_id_fkey(email)')
    .eq('student_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const email = (data as any).profiles?.email ?? data.coach_id;
  return { id: data.coach_id as string, email: email as string };
}

/** Returns all students for the current coach. */
export async function getMyStudents(): Promise<{ id: string; email: string }[]> {
  const client = db();
  const user = await currentUser();

  const { data, error } = await client
    .from('coach_students')
    .select('student_id, profiles!coach_students_student_id_fkey(email)')
    .eq('coach_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data ?? []).map((r: any) => ({
    id: r.student_id as string,
    email: r.profiles?.email ?? r.student_id,
  }));
}

/** Remove a student from the coach's roster. */
export async function removeStudent(studentId: string): Promise<void> {
  const user = await currentUser();
  const { error } = await db()
    .from('coach_students')
    .delete()
    .eq('coach_id', user.id)
    .eq('student_id', studentId);
  if (error) throw error;
}

/** Student leaves coach. */
export async function leaveCoach(): Promise<void> {
  const user = await currentUser();
  const { error } = await db()
    .from('coach_students')
    .delete()
    .eq('student_id', user.id);
  if (error) throw error;
}

// ── Review sessions ────────────────────────────────────────────────────────────

/** Student submits a HH for review. */
export async function submitReview(
  coachId: string,
  name: string,
  hands: HandHistory[]
): Promise<ReviewSession> {
  const client = db();
  const user = await currentUser();

  const { data, error } = await client
    .from('review_sessions')
    .insert({
      student_id: user.id,
      coach_id: coachId,
      name: name.trim() || `Review ${new Date().toLocaleDateString('pt-BR')}`,
      hands_json: hands,
      status: 'pending',
    })
    .select('id, student_id, coach_id, name, status, created_at, updated_at, finalized_at, student_confirmed_at')
    .single();

  if (error) throw error;

  // Notify coach
  try {
    await client.from('user_notifications').insert({
      user_id: coachId,
      title: '📬 Nova review recebida',
      body: `${user.email} enviou "${name}" com ${hands.length} mãos para revisão.`,
      type: 'info',
    });
  } catch { /* notification is non-critical */ }

  return { ...(data as ReviewSession), hands_count: hands.length };
}

/** Coach sees all pending/annotating reviews. */
export async function getCoachInbox(): Promise<ReviewSession[]> {
  const client = db();
  const user = await currentUser();

  const { data, error } = await client
    .from('review_sessions')
    .select('id, student_id, coach_id, name, status, created_at, updated_at, finalized_at, student_confirmed_at, profiles!review_sessions_student_id_fkey(email)')
    .eq('coach_id', user.id)
    .in('status', ['pending', 'annotating'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    student_email: r.profiles?.email ?? r.student_id,
    hands_count: undefined,
  })) as ReviewSession[];
}

/** Coach sees completed reviews. */
export async function getCoachDone(): Promise<ReviewSession[]> {
  const client = db();
  const user = await currentUser();

  const { data, error } = await client
    .from('review_sessions')
    .select('id, student_id, coach_id, name, status, created_at, updated_at, finalized_at, student_confirmed_at, profiles!review_sessions_student_id_fkey(email)')
    .eq('coach_id', user.id)
    .in('status', ['done', 'confirmed'])
    .order('finalized_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    student_email: r.profiles?.email ?? r.student_id,
  })) as ReviewSession[];
}

/** Student sees their sent reviews. */
export async function getMyReviews(): Promise<ReviewSession[]> {
  const client = db();
  const user = await currentUser();

  const { data, error } = await client
    .from('review_sessions')
    .select('id, student_id, coach_id, name, status, created_at, updated_at, finalized_at, student_confirmed_at, profiles!review_sessions_coach_id_fkey(email)')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    coach_email: r.profiles?.email ?? r.coach_id,
  })) as ReviewSession[];
}

/** Loads hand history JSON from a review session. */
export async function loadReviewHands(reviewId: string): Promise<HandHistory[]> {
  const { data, error } = await db()
    .from('review_sessions')
    .select('hands_json')
    .eq('id', reviewId)
    .single();

  if (error) throw error;
  return (data?.hands_json ?? []) as HandHistory[];
}

/** Coach marks session as "annotating" (opened). */
export async function startAnnotating(reviewId: string): Promise<void> {
  const { error } = await db()
    .from('review_sessions')
    .update({ status: 'annotating' })
    .eq('id', reviewId);
  if (error) throw error;
}

/** Coach finalizes review — notifies student. */
export async function finalizeCoachReview(reviewId: string): Promise<void> {
  const client = db();
  const user = await currentUser();

  const { data: session, error: fetchErr } = await client
    .from('review_sessions')
    .select('student_id, name')
    .eq('id', reviewId)
    .single();

  if (fetchErr || !session) throw fetchErr ?? new Error('Sessão não encontrada.');

  const { error } = await client
    .from('review_sessions')
    .update({ status: 'done', finalized_at: new Date().toISOString() })
    .eq('id', reviewId)
    .eq('coach_id', user.id);

  if (error) throw error;

  // Notify student
  try {
    await client.from('user_notifications').insert({
      user_id: session.student_id,
      title: '✅ Review concluída pelo coach',
      body: `Seu coach finalizou as anotações em "${session.name}". Acesse o Modo Coach para ver.`,
      type: 'info',
      action_url: `?open_review=${reviewId}`,
    });
  } catch { /* non-critical */ }
}

/** Student confirms they've reviewed the annotations. */
export async function confirmReview(reviewId: string): Promise<void> {
  const user = await currentUser();
  const { error } = await db()
    .from('review_sessions')
    .update({ status: 'confirmed', student_confirmed_at: new Date().toISOString() })
    .eq('id', reviewId)
    .eq('student_id', user.id);
  if (error) throw error;
}

// ── Annotations ────────────────────────────────────────────────────────────────

export async function getReviewAnnotations(reviewId: string): Promise<ReviewAnnotation[]> {
  const { data, error } = await db()
    .from('review_annotations')
    .select('*')
    .eq('review_session_id', reviewId)
    .order('updated_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ReviewAnnotation[];
}

export async function getAllReviewAnnotations(
  reviewId: string
): Promise<Record<string, ReviewAnnotation[]>> {
  const anns = await getReviewAnnotations(reviewId);
  const result: Record<string, ReviewAnnotation[]> = {};
  for (const ann of anns) {
    if (!result[ann.hand_key]) result[ann.hand_key] = [];
    result[ann.hand_key].push(ann);
  }
  return result;
}

export async function upsertReviewAnnotation(
  reviewId: string,
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
): Promise<ReviewAnnotation> {
  const client = db();
  const user = await currentUser();

  const { data, error } = await client
    .from('review_annotations')
    .upsert(
      {
        review_session_id: reviewId,
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
      { onConflict: 'review_session_id,hand_key,author_id,street' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as ReviewAnnotation;
}

export async function deleteReviewAnnotation(annotationId: string): Promise<void> {
  const { error } = await db()
    .from('review_annotations')
    .delete()
    .eq('id', annotationId);
  if (error) throw error;
}

// ── Realtime ───────────────────────────────────────────────────────────────────

export function subscribeToReviewSession(
  reviewId: string,
  onUpdate: (partial: Partial<ReviewSession>) => void
) {
  return db()
    .channel(`review_session:${reviewId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'review_sessions', filter: `id=eq.${reviewId}` },
      payload => onUpdate(payload.new as Partial<ReviewSession>)
    )
    .subscribe();
}

export function subscribeToReviewAnnotations(
  reviewId: string,
  onUpsert: (ann: ReviewAnnotation) => void,
  onDelete: (id: string, handKey: string) => void
) {
  return db()
    .channel(`review_annotations:${reviewId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'review_annotations', filter: `review_session_id=eq.${reviewId}` },
      payload => {
        if (payload.eventType === 'DELETE') {
          const old = payload.old as any;
          onDelete(old.id, old.hand_key);
        } else {
          onUpsert(payload.new as ReviewAnnotation);
        }
      }
    )
    .subscribe();
}

export function unsubscribeReview(channel: ReturnType<typeof subscribeToReviewSession>) {
  if (supabase && channel) supabase.removeChannel(channel);
}
