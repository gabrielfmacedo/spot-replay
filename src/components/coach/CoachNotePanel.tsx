import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Save, Loader2, Star, Tag, AlertTriangle, Info, AlertCircle,
  Check, BookOpen, ExternalLink, Plus, Link2,
} from 'lucide-react';
import { upsertReviewAnnotation } from '../../services/coachService';
import { ReviewAnnotation } from '../../types';

// ─── Config ───────────────────────────────────────────────────────────────────

const STREETS = [
  { id: 'GENERAL',  label: 'Geral' },
  { id: 'PREFLOP',  label: 'Pré' },
  { id: 'FLOP',     label: 'Flop' },
  { id: 'TURN',     label: 'Turn' },
  { id: 'RIVER',    label: 'River' },
];

const SEVERITIES = [
  { id: 'info',     label: 'Info',    color: 'text-blue-400',  bg: 'bg-blue-500/20 border-blue-500/30',   icon: <Info size={10} /> },
  { id: 'warning',  label: 'Atenção', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30', icon: <AlertTriangle size={10} /> },
  { id: 'critical', label: 'Crítico', color: 'text-red-400',   bg: 'bg-red-500/20 border-red-500/30',     icon: <AlertCircle size={10} /> },
];

const PRESET_TAGS = ['Erro', 'Boa Jogada', 'Bluff', 'Value', 'Sizing', 'GTO', 'Exploitativo', 'Revisar'];

interface CoachNotePanelProps {
  reviewId: string;
  handKey: string;
  role: 'coach' | 'student';
  currentUser: { id: string; email: string; name: string };
  currentStreet?: string;
  currentStep?: number;
  /** Current annotation for this hand (from parent's reviewAnnotations index). */
  existingAnnotation?: ReviewAnnotation;
  onSaved: (ann: ReviewAnnotation) => void;
  onClose: () => void;
}

const CoachNotePanel: React.FC<CoachNotePanelProps> = ({
  reviewId, handKey, role, currentUser, currentStreet, currentStep,
  existingAnnotation, onSaved, onClose,
}) => {
  const [text, setText]         = useState(existingAnnotation?.text ?? '');
  const [tags, setTags]         = useState<string[]>(existingAnnotation?.tags ?? []);
  const [starred, setStarred]   = useState(existingAnnotation?.starred ?? false);
  const [street, setStreet]     = useState(existingAnnotation?.street ?? currentStreet ?? 'GENERAL');
  const [severity, setSeverity] = useState<'info' | 'warning' | 'critical'>(existingAnnotation?.severity ?? 'info');
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [linkUrl, setLinkUrl]   = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [studyLinks, setStudyLinks] = useState(existingAnnotation?.study_links ?? []);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canAnnotate = role === 'coach';

  // Sync when hand changes
  useEffect(() => {
    setText(existingAnnotation?.text ?? '');
    setTags(existingAnnotation?.tags ?? []);
    setStarred(existingAnnotation?.starred ?? false);
    setStreet(existingAnnotation?.street ?? currentStreet ?? 'GENERAL');
    setSeverity(existingAnnotation?.severity ?? 'info');
    setStudyLinks(existingAnnotation?.study_links ?? []);
    setSaved(false);
  }, [handKey]); // eslint-disable-line

  // Sync street with replay
  useEffect(() => {
    if (currentStreet && currentStreet !== 'ALLIN_REVEAL' && !existingAnnotation) {
      setStreet(currentStreet);
    }
  }, [currentStreet]); // eslint-disable-line

  const doSave = useCallback(async (overrides?: Partial<typeof existingAnnotation>) => {
    if (!canAnnotate) return;
    setSaving(true);
    try {
      const ann = await upsertReviewAnnotation(
        reviewId,
        handKey,
        {
          text: overrides?.text ?? text,
          tags: overrides?.tags ?? tags,
          starred: overrides?.starred ?? starred,
          street,
          severity,
          step_index: currentStep,
          study_links: overrides?.study_links ?? studyLinks,
        },
        currentUser.name || currentUser.email,
        role
      );
      onSaved(ann);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* silent */ }
    finally { setSaving(false); }
  }, [reviewId, handKey, text, tags, starred, street, severity, currentStep, studyLinks, currentUser, role, canAnnotate, onSaved]); // eslint-disable-line

  const triggerAutoSave = () => {
    if (!canAnnotate) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(), 1200);
  };

  const toggleTag = (t: string) => {
    const next = tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t];
    setTags(next);
    triggerAutoSave();
  };

  const addLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    const next = [...studyLinks, { url, label: linkLabel.trim() || url }];
    setStudyLinks(next);
    setLinkUrl(''); setLinkLabel(''); setShowLinkInput(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave({ study_links: next } as any), 400);
  };

  const removeLink = (i: number) => {
    const next = studyLinks.filter((_, idx) => idx !== i);
    setStudyLinks(next);
  };

  const sevCfg = SEVERITIES.find(s => s.id === severity) ?? SEVERITIES[0];

  return (
    <div className="w-72 bg-[#080d1a] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${severity === 'critical' ? 'bg-red-500' : severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
          <span className="text-[11px] font-black uppercase tracking-widest text-white">
            {canAnnotate ? 'Nota do Coach' : 'Nota da Review'}
          </span>
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors p-0.5">
          <X size={13} />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3 flex-1 overflow-y-auto">

        {/* Street chips */}
        <div className="flex gap-1 flex-wrap">
          {STREETS.map(s => (
            <button key={s.id} onClick={() => { setStreet(s.id); triggerAutoSave(); }}
              disabled={!canAnnotate}
              className={`text-[10px] font-black px-2.5 py-1 rounded-lg transition-all disabled:opacity-60 ${
                street === s.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10'
              }`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Severity */}
        <div className="flex gap-1.5">
          {SEVERITIES.map(sv => (
            <button key={sv.id} onClick={() => { setSeverity(sv.id as any); triggerAutoSave(); }}
              disabled={!canAnnotate}
              className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all disabled:opacity-60 ${
                severity === sv.id ? `${sv.bg} ${sv.color}` : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'
              }`}>
              {sv.icon} {sv.label}
            </button>
          ))}
        </div>

        {/* Text area */}
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); triggerAutoSave(); }}
          placeholder={canAnnotate ? 'Escreva sua análise desta mão...' : 'Sem anotação do coach para esta mão.'}
          disabled={!canAnnotate}
          rows={4}
          className="w-full bg-black/40 border border-white/8 rounded-xl px-3 py-2.5 text-[13px] text-white outline-none focus:border-blue-500/50 transition-colors resize-none leading-relaxed placeholder:text-slate-600 disabled:opacity-50 disabled:cursor-default"
        />

        {/* Tags */}
        {canAnnotate && (
          <div className="flex flex-wrap gap-1">
            {PRESET_TAGS.map(t => (
              <button key={t} onClick={() => toggleTag(t)}
                className={`text-[9px] font-black px-2 py-0.5 rounded-full border transition-all ${
                  tags.includes(t)
                    ? 'bg-blue-600/30 border-blue-500/50 text-blue-300'
                    : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'
                }`}>
                {t}
              </button>
            ))}
          </div>
        )}
        {!canAnnotate && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map(t => (
              <span key={t} className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300">{t}</span>
            ))}
          </div>
        )}

        {/* Star */}
        {canAnnotate && (
          <button onClick={() => { setStarred(v => !v); triggerAutoSave(); }}
            className={`flex items-center gap-1.5 text-[10px] font-black transition-colors ${starred ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}`}>
            <Star size={12} className={starred ? 'fill-amber-400' : ''} />
            {starred ? 'Marcada' : 'Marcar mão'}
          </button>
        )}

        {/* Study links */}
        {(canAnnotate || studyLinks.length > 0) && (
          <div className="space-y-1.5 border-t border-white/5 pt-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-emerald-500/70 tracking-widest flex items-center gap-1">
                <BookOpen size={9} /> Material de Estudo
              </span>
              {canAnnotate && (
                <button onClick={() => setShowLinkInput(v => !v)}
                  className="text-[9px] font-black text-slate-500 hover:text-emerald-400 transition-colors flex items-center gap-0.5">
                  <Plus size={9} /> Adicionar
                </button>
              )}
            </div>
            {studyLinks.map((lk, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-2 py-1.5">
                <ExternalLink size={9} className="text-emerald-400 shrink-0" />
                <a href={lk.url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-[10px] text-emerald-400 hover:text-emerald-300 truncate transition-colors">
                  {lk.label}
                </a>
                {canAnnotate && (
                  <button onClick={() => removeLink(i)} className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
                    <X size={9} />
                  </button>
                )}
              </div>
            ))}
            {showLinkInput && canAnnotate && (
              <div className="space-y-1.5 p-2.5 bg-black/30 border border-white/8 rounded-xl">
                <input value={linkLabel} onChange={e => setLinkLabel(e.target.value)}
                  placeholder="Nome do material"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50" />
                <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                  placeholder="URL"
                  onKeyDown={e => e.key === 'Enter' && addLink()}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50" />
                <button onClick={addLink} disabled={!linkUrl.trim()}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-black hover:bg-emerald-600/30 disabled:opacity-40 transition-colors">
                  <Link2 size={10} /> Adicionar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: save */}
      {canAnnotate && (
        <div className="px-4 py-2.5 border-t border-white/5">
          <button onClick={() => doSave()} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-black text-[11px] uppercase tracking-widest transition-colors">
            {saving
              ? <><Loader2 size={12} className="animate-spin" /> Salvando...</>
              : saved
              ? <><Check size={12} className="text-emerald-300" /> Salvo</>
              : <><Save size={12} /> Salvar nota</>}
          </button>
        </div>
      )}
    </div>
  );
};

export default CoachNotePanel;
