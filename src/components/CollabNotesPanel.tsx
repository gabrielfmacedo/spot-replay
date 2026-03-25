
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Star, Tag, Save, Loader2, Shield, GraduationCap,
  MessageSquare, ChevronDown, ChevronUp, AlertTriangle, Info, AlertCircle, Sparkles,
  Link2, Plus, X, ExternalLink, BookOpen
} from 'lucide-react';
import { StudyLink } from '../types';
import { HandAnnotation, ReplaySession } from '../types';
import {
  getAnnotations, upsertAnnotation,
  subscribeToAnnotations, unsubscribeChannel
} from '../services/collabService';

interface CollabNotesPanelProps {
  session: ReplaySession;
  handKey: string;
  currentUser: { id: string; email: string; name: string };
  userRole: 'owner' | 'coach' | 'student';
  canAnnotate: boolean;
  currentStreet?: string;
  currentStep?: number;
  allAnnotations?: HandAnnotation[];   // todas anotações da sessão (para o resumo IA)
  onOpenAISummary?: () => void;
}

const PRESET_TAGS = ['Bluff', 'Value', 'Erro', 'Boa Jogada', 'Revisar', 'GTO', 'Exploitativo', 'Sizing', 'Spot'];

const STREETS = [
  { id: 'GENERAL',  label: 'Geral' },
  { id: 'PREFLOP',  label: 'Pré-Flop' },
  { id: 'FLOP',     label: 'Flop' },
  { id: 'TURN',     label: 'Turn' },
  { id: 'RIVER',    label: 'River' },
  { id: 'SHOWDOWN', label: 'Showdown' },
];

const SEVERITIES = [
  { id: 'info',     label: 'Info',      color: 'text-blue-400',   bg: 'bg-blue-500/20',   icon: <Info size={9} /> },
  { id: 'warning',  label: 'Atenção',   color: 'text-amber-400',  bg: 'bg-amber-500/20',  icon: <AlertTriangle size={9} /> },
  { id: 'critical', label: 'Crítico',   color: 'text-red-400',    bg: 'bg-red-500/20',    icon: <AlertCircle size={9} /> },
];

const severityConfig = (s: string) => SEVERITIES.find(sv => sv.id === s) ?? SEVERITIES[0];
const streetLabel = (s: string) => STREETS.find(st => st.id === s)?.label ?? s;

const CollabNotesPanel: React.FC<CollabNotesPanelProps> = ({
  session, handKey, currentUser, userRole, canAnnotate, currentStreet, currentStep,
  allAnnotations, onOpenAISummary,
}) => {
  const [annotations, setAnnotations] = useState<HandAnnotation[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [connected, setConnected]     = useState(false);
  const [collapsed, setCollapsed]     = useState(false);

  // Own draft
  const [text, setText]               = useState('');
  const [tags, setTags]               = useState<string[]>([]);
  const [starred, setStarred]         = useState(false);
  const [street, setStreet]           = useState<string>('GENERAL');
  const [severity, setSeverity]       = useState<'info' | 'warning' | 'critical'>('info');
  const [pinStep, setPinStep]         = useState(false);
  const [studyLinks, setStudyLinks]   = useState<StudyLink[]>([]);
  const [linkUrl, setLinkUrl]         = useState('');
  const [linkLabel, setLinkLabel]     = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  const channelRef  = useRef<any>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill street from replay when opening
  useEffect(() => {
    if (currentStreet && currentStreet !== 'ALLIN_REVEAL') setStreet(currentStreet);
  }, [currentStreet]);

  const loadAnnotations = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAnnotations(session.id);
      const forHand = all.filter(a => a.hand_key === handKey);
      setAnnotations(forHand);

      // Pre-fill own general note if exists
      const own = forHand.find(a => a.author_id === currentUser.id && a.street === street);
      if (own) {
        setText(own.text); setTags(own.tags); setStarred(own.starred);
        setSeverity(own.severity ?? 'info');
        setStudyLinks(own.study_links ?? []);
      } else {
        setText(''); setTags([]); setStarred(false); setSeverity('info'); setStudyLinks([]);
      }
    } catch (_) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [session.id, handKey, currentUser.id, street]);

  useEffect(() => { loadAnnotations(); }, [loadAnnotations]);

  // Realtime subscription
  useEffect(() => {
    const ch = subscribeToAnnotations(
      session.id,
      (ann) => {
        if (ann.hand_key !== handKey) return;
        setAnnotations(prev => {
          const idx = prev.findIndex(a => a.id === ann.id);
          return idx >= 0 ? prev.map((a, i) => i === idx ? ann : a) : [...prev, ann];
        });
        if (ann.author_id === currentUser.id && ann.street === street) {
          setText(ann.text); setTags(ann.tags); setStarred(ann.starred);
          setSeverity(ann.severity ?? 'info');
          setStudyLinks(ann.study_links ?? []);
        }
      },
      (id) => setAnnotations(prev => prev.filter(a => a.id !== id))
    );
    channelRef.current = ch;
    setConnected(true);
    return () => { unsubscribeChannel(ch); setConnected(false); };
  }, [session.id, handKey, currentUser.id, street]);

  const handleSave = async () => {
    if (!canAnnotate) return;
    setSaving(true);
    try {
      const roleName = userRole === 'owner' ? 'coach' : userRole;
      await upsertAnnotation(
        session.id, handKey,
        { text, tags, starred, street, severity, step_index: pinStep ? currentStep : undefined, study_links: studyLinks },
        currentUser.name || currentUser.email,
        roleName,
      );
    } catch (_) { /* silent */ } finally { setSaving(false); }
  };

  const triggerAutoSave = useCallback(() => {
    if (!canAnnotate) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(handleSave, 1500);
  }, [canAnnotate, text, tags, starred, street, severity, pinStep]); // eslint-disable-line

  const toggleTag = (t: string) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const addStudyLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    const label = linkLabel.trim() || url;
    const newLinks = [...studyLinks, { url, label }];
    setStudyLinks(newLinks);
    setLinkUrl(''); setLinkLabel(''); setShowLinkInput(false);
    // auto-save with new links
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (!canAnnotate) return;
      const roleName = userRole === 'owner' ? 'coach' : userRole;
      upsertAnnotation(
        session.id, handKey,
        { text, tags, starred, street, severity, step_index: pinStep ? currentStep : undefined, study_links: newLinks },
        currentUser.name || currentUser.email,
        roleName,
      ).catch(() => {});
    }, 300);
  };

  const removeStudyLink = (idx: number) => {
    const newLinks = studyLinks.filter((_, i) => i !== idx);
    setStudyLinks(newLinks);
  };

  const othersAnnotations = annotations.filter(a => a.author_id !== currentUser.id);
  const coachAnnotations  = othersAnnotations.filter(a => a.author_role === 'coach' || a.author_role === 'owner');
  const studentAnnotations = othersAnnotations.filter(a => a.author_role === 'student');

  const roleColor = (role: string) =>
    role === 'coach' || role === 'owner' ? 'text-amber-400 bg-amber-500/20' : 'text-blue-400 bg-blue-500/20';
  const roleIcon  = (role: string) =>
    role === 'coach' || role === 'owner' ? <Shield size={9} /> : <GraduationCap size={9} />;

  const AnnotationCard = ({ ann }: { ann: HandAnnotation }) => {
    const sev = severityConfig(ann.severity);
    return (
      <div className={`bg-white/[0.03] border rounded-xl p-3 ${ann.severity === 'critical' ? 'border-red-500/30' : ann.severity === 'warning' ? 'border-amber-500/20' : 'border-white/5'}`}>
        {/* Author row */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[8px] font-black text-white shrink-0">
            {ann.author_name[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="text-[9px] font-black text-white">{ann.author_name}</span>
          <span className={`flex items-center gap-0.5 text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full ${roleColor(ann.author_role)}`}>
            {roleIcon(ann.author_role)} {ann.author_role === 'owner' ? 'coach' : ann.author_role}
          </span>
          {/* Street badge */}
          {ann.street && ann.street !== 'GENERAL' && (
            <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full bg-white/10 text-slate-400">
              {streetLabel(ann.street)}
            </span>
          )}
          {/* Severity badge */}
          <span className={`flex items-center gap-0.5 text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full ${sev.bg} ${sev.color}`}>
            {sev.icon} {sev.label}
          </span>
          {ann.starred && <Star size={10} className="text-amber-400 fill-amber-400 ml-auto" />}
        </div>
        {ann.text && <p className="text-[10px] text-slate-300 leading-relaxed whitespace-pre-wrap">{ann.text}</p>}
        {ann.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {ann.tags.map(t => (
              <span key={t} className="text-[7px] font-black uppercase bg-white/10 text-slate-400 px-1.5 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        )}
        {ann.step_index !== undefined && ann.step_index !== null && (
          <p className="text-[7px] text-slate-600 mt-1.5">📍 Marcado no step {ann.step_index}</p>
        )}
        {ann.study_links && ann.study_links.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-white/5">
            <p className="text-[7px] font-black uppercase text-emerald-500/70 tracking-widest mb-1.5 flex items-center gap-1">
              <BookOpen size={8} /> Material de Estudo
            </p>
            <div className="space-y-1">
              {ann.study_links.map((lk, i) => (
                <a key={i} href={lk.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[9px] text-emerald-400 hover:text-emerald-300 transition-colors">
                  <ExternalLink size={9} className="shrink-0" />
                  <span className="truncate">{lk.label}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const totalCoachNotes = coachAnnotations.length;

  return (
    <div className="bg-[#0a0f1a] border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-blue-400" />
          <span className="text-[10px] font-black uppercase text-white tracking-widest">Notas do Coach</span>
          {totalCoachNotes > 0 && (
            <span className="text-[8px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-black">{totalCoachNotes}</span>
          )}
          {annotations.length > totalCoachNotes && (
            <span className="text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-black">{annotations.length - totalCoachNotes}</span>
          )}
          <div className={`w-1.5 h-1.5 rounded-full ml-1 ${connected ? 'bg-emerald-400' : 'bg-slate-600'}`} title={connected ? 'Online' : 'Offline'} />
        </div>
        <div className="flex items-center gap-2">
          {onOpenAISummary && (allAnnotations?.length ?? 0) > 0 && (
            <button
              onClick={e => { e.stopPropagation(); onOpenAISummary(); }}
              className="flex items-center gap-1 px-2 py-1 bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 rounded-lg text-[8px] font-black uppercase text-violet-300 transition-all"
              title="Gerar resumo com IA"
            >
              <Sparkles size={9} /> IA
            </button>
          )}
          {collapsed ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronUp size={14} className="text-slate-500" />}
        </div>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">

          {/* Coach annotations first (golden border) */}
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-blue-400" /></div>
          ) : (
            <>
              {coachAnnotations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[7px] font-black uppercase text-amber-500/70 tracking-widest">Coach</p>
                  {coachAnnotations.map(ann => <AnnotationCard key={ann.id} ann={ann} />)}
                </div>
              )}
              {studentAnnotations.length > 0 && (
                <div className="space-y-2 mt-3">
                  <p className="text-[7px] font-black uppercase text-blue-400/70 tracking-widest">Aluno</p>
                  {studentAnnotations.map(ann => <AnnotationCard key={ann.id} ann={ann} />)}
                </div>
              )}
            </>
          )}

          {/* Own note editor */}
          {canAnnotate && (
            <div className="space-y-2 border-t border-white/5 pt-3 mt-1">
              <p className="text-[7px] font-black uppercase text-slate-600 tracking-widest">Sua anotação</p>

              {/* Street selector */}
              <div className="flex flex-wrap gap-1">
                {STREETS.map(s => (
                  <button key={s.id} onClick={() => setStreet(s.id)}
                    className={`text-[7px] font-black uppercase px-2 py-1 rounded-full transition-all ${street === s.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Severity selector */}
              <div className="flex gap-1">
                {SEVERITIES.map(sv => (
                  <button key={sv.id} onClick={() => { setSeverity(sv.id as any); triggerAutoSave(); }}
                    className={`flex items-center gap-1 text-[7px] font-black uppercase px-2 py-1 rounded-full transition-all ${severity === sv.id ? `${sv.bg} ${sv.color}` : 'bg-white/5 text-slate-500 hover:text-white'}`}>
                    {sv.icon} {sv.label}
                  </button>
                ))}
              </div>

              {/* Star + pin step */}
              <div className="flex items-center gap-3">
                <button onClick={() => { setStarred(v => !v); triggerAutoSave(); }}
                  className={`flex items-center gap-1.5 text-[9px] font-black uppercase transition-colors ${starred ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}`}>
                  <Star size={12} className={starred ? 'fill-amber-400' : ''} />
                  {starred ? 'Marcada' : 'Marcar'}
                </button>
                {currentStep !== undefined && (
                  <button onClick={() => setPinStep(v => !v)}
                    className={`flex items-center gap-1 text-[9px] font-black uppercase transition-colors ${pinStep ? 'text-emerald-400' : 'text-slate-600 hover:text-slate-400'}`}>
                    📍 {pinStep ? `Step ${currentStep}` : 'Fixar step'}
                  </button>
                )}
              </div>

              {/* Text area */}
              <textarea
                value={text}
                onChange={e => { setText(e.target.value); triggerAutoSave(); }}
                placeholder="Escreva sua análise desta mão..."
                rows={3}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-[11px] text-white outline-none focus:border-blue-500/50 transition-colors resize-none leading-relaxed placeholder:text-slate-600"
              />

              {/* Tag chips */}
              <div className="flex flex-wrap gap-1">
                {PRESET_TAGS.map(t => (
                  <button key={t} onClick={() => { toggleTag(t); triggerAutoSave(); }}
                    className={`flex items-center gap-1 text-[7px] font-black uppercase px-2 py-1 rounded-full transition-all ${tags.includes(t) ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10'}`}>
                    <Tag size={7} /> {t}
                  </button>
                ))}
              </div>

              {/* Study links */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[7px] font-black uppercase text-emerald-500/70 tracking-widest flex items-center gap-1">
                    <BookOpen size={8} /> Material de Estudo
                  </span>
                  <button onClick={() => setShowLinkInput(v => !v)}
                    className="flex items-center gap-0.5 text-[7px] font-black uppercase text-slate-500 hover:text-emerald-400 transition-colors">
                    <Plus size={9} /> Adicionar link
                  </button>
                </div>
                {studyLinks.map((lk, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-2 py-1.5">
                    <ExternalLink size={9} className="text-emerald-400 shrink-0" />
                    <span className="flex-1 text-[9px] text-emerald-400 truncate">{lk.label}</span>
                    <button onClick={() => removeStudyLink(i)} className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
                      <X size={9} />
                    </button>
                  </div>
                ))}
                {showLinkInput && (
                  <div className="space-y-1.5 bg-white/[0.03] border border-white/10 rounded-xl p-2.5">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={linkUrl}
                      onChange={e => setLinkUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addStudyLink()}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-emerald-500/50 transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="Descrição (ex: Solver GTO para cbets)"
                      value={linkLabel}
                      onChange={e => setLinkLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addStudyLink()}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-emerald-500/50 transition-colors"
                    />
                    <div className="flex gap-1.5">
                      <button onClick={() => { setShowLinkInput(false); setLinkUrl(''); setLinkLabel(''); }}
                        className="flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase text-slate-500 hover:text-white bg-white/5 transition-colors">
                        Cancelar
                      </button>
                      <button onClick={addStudyLink}
                        className="flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-1">
                        <Link2 size={9} /> Adicionar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Save button */}
              <button onClick={handleSave} disabled={saving}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600/80 hover:bg-blue-600 disabled:opacity-50 rounded-xl text-[9px] font-black uppercase text-white transition-all">
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                {saving ? 'Salvando...' : 'Salvar Anotação'}
              </button>
            </div>
          )}

          {!canAnnotate && !loading && othersAnnotations.length === 0 && (
            <p className="text-center text-slate-600 text-[9px] uppercase font-black py-4">Nenhuma anotação ainda</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CollabNotesPanel;
