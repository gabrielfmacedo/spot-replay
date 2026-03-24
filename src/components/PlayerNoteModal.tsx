import React, { useState } from 'react';
import { X, User, Save, ChevronRight, Clock } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlayerNoteEntry {
  text: string;
  createdAt: string; // ISO string
}

export interface PlayerNoteData {
  label: string;
  entries: PlayerNoteEntry[];
}

/** Converts old { note, label } format or already-new format to PlayerNoteData */
export function migratePlayerNote(raw: unknown): PlayerNoteData {
  if (!raw || typeof raw !== 'object') return { label: '', entries: [] };
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.entries)) return raw as PlayerNoteData;
  // Old format: { note: string, label: string }
  return {
    label: (r.label as string) ?? '',
    entries: r.note ? [{ text: r.note as string, createdAt: new Date().toISOString() }] : [],
  };
}

export function lastNoteText(data: PlayerNoteData | undefined): string {
  if (!data?.entries?.length) return '';
  return data.entries[data.entries.length - 1].text;
}

// ── Label config ──────────────────────────────────────────────────────────────

const LABELS = ['Fish', 'Reg', 'Nit', 'TAG', 'LAG', 'Maniac', 'Aggro', 'Passivo'];

const LABEL_COLORS: Record<string, string> = {
  Fish:    'bg-blue-600   border-blue-600',
  Reg:     'bg-slate-600  border-slate-600',
  Nit:     'bg-slate-700  border-slate-700',
  TAG:     'bg-emerald-700 border-emerald-700',
  LAG:     'bg-orange-600 border-orange-600',
  Maniac:  'bg-red-600    border-red-600',
  Aggro:   'bg-amber-600  border-amber-600',
  Passivo: 'bg-indigo-600 border-indigo-600',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PlayerNoteModalProps {
  playerName: string;
  data: PlayerNoteData;
  onSave: (playerName: string, data: PlayerNoteData) => void;
  onClose: () => void;
  onViewHistory?: (playerName: string) => void;
}

const PREVIEW_CHARS = 200;

const PlayerNoteModal: React.FC<PlayerNoteModalProps> = ({
  playerName, data, onSave, onClose, onViewHistory,
}) => {
  const [label,   setLabel]   = useState(data.label);
  const [newNote, setNewNote] = useState('');

  const lastEntry = data.entries.length > 0 ? data.entries[data.entries.length - 1] : null;

  const save = () => {
    const trimmed = newNote.trim();
    const updatedEntries = trimmed
      ? [...data.entries, { text: trimmed, createdAt: new Date().toISOString() }]
      : data.entries;
    onSave(playerName, { label, entries: updatedEntries });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-[#0a0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <User size={13} className="text-purple-400" />
            <span className="text-[12px] font-black uppercase text-white">{playerName}</span>
            {label && (
              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full text-white ${LABEL_COLORS[label] ?? 'bg-slate-600'}`}>
                {label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Label chips */}
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Classificar jogador</p>
            <div className="flex flex-wrap gap-1.5">
              {LABELS.map(l => (
                <button key={l} onClick={() => setLabel(label === l ? '' : l)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border transition-all ${label === l ? `${LABEL_COLORS[l]} text-white` : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Last note preview */}
          {lastEntry && (
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[9px] text-slate-500">
                  <Clock size={9} />
                  <span>{fmtDate(lastEntry.createdAt)}</span>
                </div>
                {(data.entries.length > 1 || lastEntry.text.length > PREVIEW_CHARS) && onViewHistory && (
                  <button
                    onClick={() => { onClose(); onViewHistory(playerName); }}
                    className="flex items-center gap-0.5 text-[9px] font-black text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    VER NOTE COMPLETO <ChevronRight size={10} />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                {lastEntry.text.length > PREVIEW_CHARS
                  ? lastEntry.text.slice(0, PREVIEW_CHARS) + '…'
                  : lastEntry.text}
              </p>
              {data.entries.length > 1 && (
                <p className="text-[9px] text-slate-600">{data.entries.length} notas no total</p>
              )}
            </div>
          )}

          {/* New note textarea */}
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
              {lastEntry ? 'Adicionar nova nota' : 'Anotações'}
            </p>
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Tendências, reads, padrões…"
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-purple-500/50 resize-none transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10 transition-all">
            Cancelar
          </button>
          <button onClick={save}
            className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase bg-purple-600 hover:bg-purple-500 text-white transition-all flex items-center justify-center gap-1.5">
            <Save size={12} /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerNoteModal;
