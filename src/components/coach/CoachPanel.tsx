import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Copy, Check, RefreshCw, Loader2, AlertCircle,
  BookOpen, Send, Inbox, Users, BarChart2, ChevronRight,
  Sparkles, CheckCircle2, Clock, Link2, UserMinus,
  FileText, Filter, UserCheck,
} from 'lucide-react';
import {
  getOrCreateInviteToken, regenerateInviteToken,
  acceptCoachInvite, getMyCoach, getMyStudents, removeStudent, leaveCoach,
  submitReview, getCoachInbox, getMyReviews, getCoachDone,
  loadReviewHands, startAnnotating, finalizeCoachReview, confirmReview,
  getReviewAnnotations,
} from '../../services/coachService';
import { generateCoachSummary } from '../../services/aiService';
import { ReviewSession, ReviewAnnotation, HandHistory, HandAnnotation } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Aguardando',  color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  annotating: { label: 'Em revisão', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  done:       { label: 'Concluída',  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  confirmed:  { label: 'Confirmada', color: 'text-slate-400 bg-white/5 border-white/10' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABEL[status] ?? STATUS_LABEL.pending;
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest border rounded px-1.5 py-0.5 ${s.color}`}>
      {s.label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-white transition-colors px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10">
      {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  );
}

// ─── AI Summary ───────────────────────────────────────────────────────────────

function AISummary({ annotations }: { annotations: ReviewAnnotation[] }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const generate = async () => {
    setLoading(true); setError(''); setText(''); setDone(false);
    try {
      await generateCoachSummary(
        annotations as unknown as HandAnnotation[],
        chunk => setText(chunk)
      );
      setDone(true);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao gerar resumo.');
    } finally { setLoading(false); }
  };

  const coachAnns = annotations.filter(a => a.text.trim());

  if (coachAnns.length === 0) return (
    <p className="text-[11px] text-slate-600 text-center py-4">Sem anotações para resumir.</p>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
          <Sparkles size={10} className="text-violet-400" /> Resumo IA
        </p>
        <div className="flex gap-2">
          {text && <CopyButton text={text} />}
          <button onClick={generate} disabled={loading}
            className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 transition-colors disabled:opacity-50">
            {loading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
            {loading ? 'Gerando...' : done ? 'Regenerar' : 'Gerar Resumo'}
          </button>
        </div>
      </div>
      {error && (
        <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
      )}
      {text && (
        <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
          {text}
          {loading && <span className="inline-block w-1 h-3 bg-violet-400 animate-pulse ml-0.5 align-middle" />}
        </div>
      )}
    </div>
  );
}

// ─── Annotations export ───────────────────────────────────────────────────────

function AnnotationsExport({ annotations, sessionName }: { annotations: ReviewAnnotation[]; sessionName: string }) {
  const coachAnns = annotations.filter(a => a.text.trim());
  if (!coachAnns.length) return null;

  const textBlock = `REVIEW: ${sessionName}\n${'─'.repeat(40)}\n\n` +
    coachAnns.map((a, i) =>
      `MÃO ${i + 1} | ${a.street} | ${a.severity.toUpperCase()}\n` +
      (a.tags?.length ? `Tags: ${a.tags.join(', ')}\n` : '') +
      a.text.trim() +
      (a.study_links?.length ? `\nLinks: ${a.study_links.map(l => `${l.label} — ${l.url}`).join(' | ')}` : '')
    ).join('\n\n─────\n\n');

  return (
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
        <FileText size={10} /> {coachAnns.length} anotações
      </p>
      <CopyButton text={textBlock} />
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CoachPanelProps {
  currentUser: { id: string; email: string; name: string };
  currentHands: HandHistory[];
  onOpenReview: (reviewId: string, role: 'coach' | 'student', hands: HandHistory[], sessionName: string) => void;
  onFilterAnnotated: (reviewId: string | null) => void;
  onClose: () => void;
  /** Token from ?coach_invite= URL param — pre-fills connect form. */
  initialInviteToken?: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

const CoachPanel: React.FC<CoachPanelProps> = ({
  currentUser, currentHands, onOpenReview, onFilterAnnotated, onClose, initialInviteToken,
}) => {
  // Role detection
  const [myCoach, setMyCoach]       = useState<{ id: string; email: string } | null | undefined>(undefined);
  const [myStudents, setMyStudents] = useState<{ id: string; email: string }[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<'inbox' | 'students' | 'myreviews' | 'done'>('inbox');

  // Invite
  const [inviteToken, setInviteToken]   = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);

  // Connect to coach (student side)
  const [connectToken, setConnectToken] = useState(initialInviteToken ?? '');
  const [connecting, setConnecting]     = useState(false);
  const [connectError, setConnectError] = useState('');
  const [connectOk, setConnectOk]       = useState(false);

  // Reviews
  const [inbox, setInbox]           = useState<ReviewSession[]>([]);
  const [myReviews, setMyReviews]   = useState<ReviewSession[]>([]);
  const [doneList, setDoneList]     = useState<ReviewSession[]>([]);
  const [listLoading, setListLoading] = useState(false);

  // Send HH form
  const [showSend, setShowSend]   = useState(false);
  const [sendName, setSendName]   = useState('');
  const [sending, setSending]     = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendOk, setSendOk]       = useState(false);

  // Open review detail
  const [openReview, setOpenReview]   = useState<ReviewSession | null>(null);
  const [reviewAnns, setReviewAnns]   = useState<ReviewAnnotation[]>([]);
  const [annsLoading, setAnnsLoading] = useState(false);
  const [finalizing, setFinalizing]   = useState(false);
  const [confirming, setConfirming]   = useState(false);

  // Misc
  const [err, setErr] = useState('');
  const isCoach   = myStudents.length > 0;
  const isStudent = myCoach !== undefined && myCoach !== null;

  // ── Load initial data ──────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [coach, students] = await Promise.all([getMyCoach(), getMyStudents()]);
      setMyCoach(coach);
      setMyStudents(students);
      if (students.length > 0) setTab('inbox');
      else if (coach) setTab('myreviews');
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao carregar dados do servidor.');
      setMyCoach(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadLists = useCallback(async () => {
    setListLoading(true);
    try {
      if (myStudents.length > 0) {
        const [i, d] = await Promise.all([getCoachInbox(), getCoachDone()]);
        setInbox(i); setDoneList(d);
      }
      if (myCoach) {
        const r = await getMyReviews();
        setMyReviews(r);
      }
    } catch { /* non-critical */ }
    finally { setListLoading(false); }
  }, [myCoach, myStudents]);

  useEffect(() => {
    if (!loading && (isCoach || isStudent)) loadLists();
  }, [loading, isCoach, isStudent, loadLists]);

  // ── Invite token ───────────────────────────────────────────────────────────

  const loadToken = useCallback(async () => {
    if (inviteToken) return;
    setTokenLoading(true);
    try { setInviteToken(await getOrCreateInviteToken()); }
    catch { /* non-critical */ }
    finally { setTokenLoading(false); }
  }, [inviteToken]);

  const regenToken = async () => {
    setTokenLoading(true);
    try { setInviteToken(await regenerateInviteToken()); }
    finally { setTokenLoading(false); }
  };

  const inviteLink = inviteToken
    ? `${window.location.origin}?coach_invite=${inviteToken}`
    : '';

  // ── Connect to coach ───────────────────────────────────────────────────────

  const handleConnect = async () => {
    const raw = connectToken.trim();
    if (!raw) return;
    setConnecting(true); setConnectError(''); setConnectOk(false);
    try {
      // Accept both full URL and raw token
      const token = raw.includes('coach_invite=')
        ? raw.split('coach_invite=').pop()!.split('&')[0]
        : raw;
      const { coachEmail } = await acceptCoachInvite(token);
      setConnectOk(true);
      setConnectToken('');
      await loadAll();
      setTab('myreviews');
    } catch (e: any) {
      setConnectError(e.message ?? 'Convite inválido ou expirado.');
    } finally { setConnecting(false); }
  };

  // ── Send HH ───────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!myCoach || currentHands.length === 0) return;
    setSending(true); setSendError(''); setSendOk(false);
    try {
      await submitReview(myCoach.id, sendName, currentHands);
      setSendOk(true);
      setSendName('');
      await loadLists();
      setTimeout(() => { setSendOk(false); setShowSend(false); }, 2000);
    } catch (e: any) {
      setSendError(e.message ?? 'Erro ao enviar.');
    } finally { setSending(false); }
  };

  // ── Open review ────────────────────────────────────────────────────────────

  const handleOpenReview = async (session: ReviewSession, role: 'coach' | 'student') => {
    setOpenReview(session); setAnnsLoading(true); setReviewAnns([]);
    try {
      const [hands, anns] = await Promise.all([
        loadReviewHands(session.id),
        getReviewAnnotations(session.id),
      ]);
      setReviewAnns(anns);
      if (role === 'coach' && session.status === 'pending') {
        await startAnnotating(session.id);
        setOpenReview(s => s ? { ...s, status: 'annotating' } : s);
      }
      onOpenReview(session.id, role, hands, session.name);
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao abrir sessão.');
      setOpenReview(null);
    } finally { setAnnsLoading(false); }
  };

  // ── Finalize / Confirm ─────────────────────────────────────────────────────

  const handleFinalize = async () => {
    if (!openReview) return;
    setFinalizing(true);
    try {
      await finalizeCoachReview(openReview.id);
      setOpenReview(s => s ? { ...s, status: 'done', finalized_at: new Date().toISOString() } : s);
      await loadLists();
    } catch (e: any) { setErr(e.message ?? 'Erro ao finalizar.'); }
    finally { setFinalizing(false); }
  };

  const handleConfirm = async () => {
    if (!openReview) return;
    setConfirming(true);
    try {
      await confirmReview(openReview.id);
      setOpenReview(s => s ? { ...s, status: 'confirmed' } : s);
      onFilterAnnotated(null);
      await loadLists();
    } catch (e: any) { setErr(e.message ?? 'Erro ao confirmar.'); }
    finally { setConfirming(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderContent = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 size={20} className="animate-spin text-slate-600" />
        <p className="text-[10px] text-slate-600">Carregando...</p>
      </div>
    );

    // ── Review detail view ─────────────────────────────────────────────────
    if (openReview) {
      const role = openReview.coach_id === currentUser.id ? 'coach' : 'student';
      const annotatedKeys = new Set(reviewAnns.filter(a => a.text.trim()).map(a => a.hand_key));

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => { setOpenReview(null); onFilterAnnotated(null); }}
              className="text-[10px] font-black text-slate-500 hover:text-white transition-colors">
              ← Voltar
            </button>
            <div className="flex-1" />
            <StatusBadge status={openReview.status} />
          </div>

          <div>
            <p className="text-[13px] font-black text-white">{openReview.name}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {role === 'coach'
                ? `Aluno: ${openReview.student_email ?? '—'}`
                : `Coach: ${openReview.coach_email ?? '—'}`}
              {openReview.finalized_at && ` · Finalizado ${new Date(openReview.finalized_at).toLocaleDateString('pt-BR')}`}
            </p>
          </div>

          {annsLoading ? (
            <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-slate-600" /></div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Mãos', value: '—' },
                  { label: 'Anotadas', value: String(annotatedKeys.size) },
                  { label: 'Status', value: STATUS_LABEL[openReview.status]?.label ?? '—' },
                ].map(s => (
                  <div key={s.label} className="bg-white/[0.03] border border-white/8 rounded-xl py-2">
                    <p className="text-[14px] font-black text-white">{s.value}</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest">{s.label}</p>
                  </div>
                ))}
              </div>

              {annotatedKeys.size > 0 && (
                <button onClick={() => onFilterAnnotated(openReview.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-300 text-[11px] font-black hover:bg-blue-600/20 transition-colors">
                  <Filter size={11} /> Mostrar só mãos anotadas ({annotatedKeys.size})
                </button>
              )}

              {reviewAnns.length > 0 && (
                <AnnotationsExport annotations={reviewAnns} sessionName={openReview.name} />
              )}

              {(role === 'coach' || openReview.status === 'done' || openReview.status === 'confirmed') && (
                <AISummary annotations={reviewAnns} />
              )}

              {role === 'coach' && (openReview.status === 'pending' || openReview.status === 'annotating') && (
                <button onClick={handleFinalize} disabled={finalizing}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-black text-[12px] uppercase tracking-widest transition-colors">
                  {finalizing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  {finalizing ? 'Finalizando...' : 'Finalizar & Notificar Aluno'}
                </button>
              )}
              {role === 'coach' && openReview.status === 'done' && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <p className="text-[11px] text-emerald-300 font-black">Revisão finalizada e aluno notificado.</p>
                </div>
              )}

              {role === 'student' && openReview.status === 'done' && (
                <button onClick={handleConfirm} disabled={confirming}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-black text-[12px] uppercase tracking-widest transition-colors">
                  {confirming ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {confirming ? 'Confirmando...' : 'Marcar Review como Concluída'}
                </button>
              )}
              {role === 'student' && openReview.status === 'confirmed' && (
                <div className="flex items-center gap-2 bg-slate-500/10 border border-slate-500/20 rounded-xl px-3 py-2.5">
                  <CheckCircle2 size={13} className="text-slate-400" />
                  <p className="text-[11px] text-slate-400 font-black">Review concluída.</p>
                </div>
              )}
              {role === 'student' && openReview.status === 'pending' && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
                  <Clock size={13} className="text-amber-400" />
                  <p className="text-[11px] text-amber-300">Aguardando seu coach revisar as mãos.</p>
                </div>
              )}
              {role === 'student' && openReview.status === 'annotating' && (
                <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2.5">
                  <BookOpen size={13} className="text-blue-400" />
                  <p className="text-[11px] text-blue-300">Seu coach está revisando agora.</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // ── Pending invite banner (shown when user came via invite link) ────────
    if (initialInviteToken && !isStudent && !connectOk) {
      return (
        <div className="space-y-4">
          {/* Invite acceptance card */}
          <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                <UserCheck size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="text-[13px] font-black text-white">Convite de Coach</p>
                <p className="text-[10px] text-slate-400">Você foi convidado para ser aluno</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ao aceitar, seu coach poderá revisar suas mãos e enviar feedback.
            </p>
            {connectError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                <AlertCircle size={11} className="text-red-400 shrink-0" />
                <p className="text-[11px] text-red-300">{connectError}</p>
              </div>
            )}
            <button onClick={handleConnect} disabled={connecting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-black text-[12px] uppercase tracking-widest transition-colors">
              {connecting ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
              {connecting ? 'Conectando...' : 'Aceitar Convite'}
            </button>
          </div>
          {/* Divider — also allow manual paste in case token pre-fill failed */}
          <div className="space-y-2">
            <p className="text-[9px] text-slate-600 uppercase tracking-widest text-center">ou cole outro link</p>
            <div className="flex gap-2">
              <input value={connectToken} onChange={e => setConnectToken(e.target.value)}
                placeholder="Cole o link ou token aqui..."
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50" />
              <button onClick={handleConnect} disabled={connecting || !connectToken.trim()}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-40 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ── No relationships yet ───────────────────────────────────────────────
    if (!isCoach && !isStudent) {
      return (
        <div className="space-y-5 py-2">
          {/* Success after connect */}
          {connectOk && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              <p className="text-[11px] text-emerald-300 font-black">Conectado com sucesso! Agora envie suas mãos para revisão.</p>
            </div>
          )}

          {/* Coach side */}
          <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 space-y-3">
            <p className="text-[11px] font-black text-white flex items-center gap-2">
              <Users size={13} className="text-blue-400" /> Sou Coach
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Gere seu link de convite e envie para seus alunos.
            </p>
            {!inviteToken ? (
              <button onClick={loadToken} disabled={tokenLoading}
                className="flex items-center gap-2 text-[11px] font-black px-3 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 transition-colors">
                {tokenLoading ? <Loader2 size={11} className="animate-spin" /> : <Link2 size={11} />}
                Gerar meu link de coach
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-slate-400 font-mono flex-1 truncate">{inviteLink}</p>
                  <CopyButton text={inviteLink} />
                </div>
                <button onClick={regenToken} disabled={tokenLoading}
                  className="flex items-center gap-1 text-[9px] text-slate-600 hover:text-slate-400 transition-colors">
                  <RefreshCw size={9} /> Regenerar link
                </button>
              </div>
            )}
          </div>

          {/* Student side */}
          <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 space-y-3">
            <p className="text-[11px] font-black text-white flex items-center gap-2">
              <BookOpen size={13} className="text-emerald-400" /> Sou Aluno
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Cole o link de convite enviado pelo seu coach.
            </p>
            <input
              value={connectToken}
              onChange={e => setConnectToken(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
              placeholder="Cole o link ou o token aqui..."
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-[11px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50 transition-colors"
            />
            {connectError && (
              <p className="text-[10px] text-red-400 flex items-center gap-1">
                <AlertCircle size={10} /> {connectError}
              </p>
            )}
            <button onClick={handleConnect} disabled={connecting || !connectToken.trim()}
              className="flex items-center gap-2 text-[11px] font-black px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-50 transition-colors">
              {connecting ? <Loader2 size={11} className="animate-spin" /> : <ChevronRight size={11} />}
              {connecting ? 'Conectando...' : 'Aceitar convite'}
            </button>
          </div>
        </div>
      );
    }

    // ── COACH TABS ─────────────────────────────────────────────────────────
    if (isCoach && (tab === 'inbox' || tab === 'done')) {
      const list = tab === 'inbox' ? inbox : doneList;
      return (
        <div className="space-y-2">
          {listLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-slate-600" /></div>
          ) : list.length === 0 ? (
            <p className="text-center text-[11px] text-slate-600 py-8">
              {tab === 'inbox' ? 'Nenhuma review pendente.' : 'Nenhuma review concluída.'}
            </p>
          ) : list.map(s => (
            <div key={s.id} className="bg-white/[0.03] border border-white/8 rounded-xl p-3 flex items-center gap-3 hover:border-white/15 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black text-white truncate">{s.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {s.student_email ?? '—'} · {new Date(s.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <StatusBadge status={s.status} />
              <button onClick={() => handleOpenReview(s, 'coach')}
                className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 transition-colors shrink-0">
                <BookOpen size={10} /> Abrir
              </button>
            </div>
          ))}
        </div>
      );
    }

    // ── COACH: Students tab ────────────────────────────────────────────────
    if (tab === 'students') {
      return (
        <div className="space-y-4">
          <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Seu link de convite</p>
            {!inviteToken ? (
              <button onClick={loadToken} disabled={tokenLoading}
                className="flex items-center gap-1.5 text-[11px] font-black text-blue-400 hover:text-blue-300">
                {tokenLoading ? <Loader2 size={11} className="animate-spin" /> : <Link2 size={11} />}
                Carregar link
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-slate-400 font-mono flex-1 truncate">{inviteLink}</p>
                  <CopyButton text={inviteLink} />
                  <button onClick={regenToken} disabled={tokenLoading} title="Regenerar">
                    <RefreshCw size={11} className="text-slate-600 hover:text-slate-400 transition-colors" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {myStudents.length === 0 ? (
            <p className="text-center text-[11px] text-slate-600 py-6">Nenhum aluno ainda.</p>
          ) : myStudents.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/8">
              <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-black text-blue-400">
                {s.email[0].toUpperCase()}
              </div>
              <p className="text-[11px] text-white flex-1 truncate">{s.email}</p>
              <button onClick={async () => { await removeStudent(s.id); setMyStudents(prev => prev.filter(x => x.id !== s.id)); }}
                className="text-slate-600 hover:text-red-400 transition-colors" title="Remover aluno">
                <UserMinus size={12} />
              </button>
            </div>
          ))}
        </div>
      );
    }

    // ── STUDENT: My reviews tab ────────────────────────────────────────────
    if (tab === 'myreviews') {
      return (
        <div className="space-y-3">
          {myCoach && (
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-3 space-y-3">
              {!showSend ? (
                <>
                  <button onClick={() => setShowSend(true)} disabled={currentHands.length === 0}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 font-black text-[11px] uppercase tracking-widest transition-colors">
                    <Send size={11} /> Enviar mãos para revisão
                  </button>
                  <p className="text-[10px] text-slate-500 text-center">Coach: {myCoach.email}</p>
                  {currentHands.length === 0 && (
                    <p className="text-[10px] text-slate-600 text-center">Importe um histórico de mãos primeiro.</p>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da review</p>
                  <input value={sendName} onChange={e => setSendName(e.target.value)}
                    placeholder={`Review ${new Date().toLocaleDateString('pt-BR')}`}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50" />
                  <p className="text-[10px] text-slate-500">{currentHands.length} mãos serão enviadas.</p>
                  {sendError && <p className="text-[10px] text-red-400">{sendError}</p>}
                  {sendOk && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                      <CheckCircle2 size={12} /> Enviado com sucesso!
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={handleSend} disabled={sending || currentHands.length === 0}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-black text-[11px] transition-colors">
                      {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                      {sending ? 'Enviando...' : 'Enviar'}
                    </button>
                    <button onClick={() => setShowSend(false)}
                      className="px-3 py-2 rounded-lg bg-white/5 text-[11px] font-black text-slate-400 hover:text-white border border-white/10 transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {listLoading ? (
            <div className="flex justify-center py-6"><Loader2 size={16} className="animate-spin text-slate-600" /></div>
          ) : myReviews.length === 0 ? (
            <p className="text-center text-[11px] text-slate-600 py-6">Nenhuma review enviada ainda.</p>
          ) : myReviews.map(s => (
            <div key={s.id} className="bg-white/[0.03] border border-white/8 rounded-xl p-3 flex items-center gap-3 hover:border-white/15 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black text-white truncate">{s.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {new Date(s.created_at).toLocaleDateString('pt-BR')}
                  {s.finalized_at && ` · Finalizado ${new Date(s.finalized_at).toLocaleDateString('pt-BR')}`}
                </p>
              </div>
              <StatusBadge status={s.status} />
              {(s.status === 'done' || s.status === 'confirmed') && (
                <button onClick={() => handleOpenReview(s, 'student')}
                  className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 transition-colors shrink-0">
                  <BookOpen size={10} /> Ver
                </button>
              )}
            </div>
          ))}

          {myCoach && (
            <button onClick={async () => { await leaveCoach(); setMyCoach(null); await loadAll(); }}
              className="w-full text-[9px] text-slate-700 hover:text-red-400 transition-colors pt-2">
              Desvincular do coach
            </button>
          )}
        </div>
      );
    }

    return null;
  };

  // ── Tab bar ────────────────────────────────────────────────────────────────

  const coachTabs = isCoach ? [
    { id: 'inbox',    label: 'Pendentes',  icon: <Inbox size={10} />,    count: inbox.length },
    { id: 'students', label: 'Alunos',     icon: <Users size={10} />,    count: myStudents.length },
    { id: 'done',     label: 'Concluídas', icon: <BarChart2 size={10} />, count: 0 },
  ] : [];

  const studentTabs = isStudent ? [
    { id: 'myreviews', label: 'Minhas Reviews', icon: <BookOpen size={10} /> },
  ] : [];

  const allTabs = [...coachTabs, ...studentTabs];

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md bg-[#070c18] border border-white/10 rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div>
            <p className="text-[13px] font-black text-white flex items-center gap-2">
              <BookOpen size={14} className="text-blue-400" /> MODO COACH
            </p>
            <p className="text-[10px] text-slate-500">{currentUser.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadLists} title="Atualizar" className="p-1.5 text-slate-600 hover:text-white transition-colors">
              <RefreshCw size={13} className={listLoading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-600 hover:text-white transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        {!openReview && allTabs.length > 1 && (
          <div className="flex gap-1 px-4 py-2 border-b border-white/5 shrink-0">
            {allTabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${
                  tab === t.id ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300' : 'text-slate-500 hover:text-white'
                }`}>
                {t.icon} {t.label}
                {'count' in t && (t as any).count > 0 && (
                  <span className="bg-blue-600 text-white rounded-full text-[8px] w-3.5 h-3.5 flex items-center justify-center">
                    {(t as any).count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {err && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-3">
              <AlertCircle size={12} className="text-red-400 shrink-0" />
              <p className="text-[11px] text-red-300">{err}</p>
              <button onClick={() => setErr('')} className="ml-auto text-slate-600 hover:text-white"><X size={11} /></button>
            </div>
          )}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default CoachPanel;
