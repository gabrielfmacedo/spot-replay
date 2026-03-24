import React, { useState } from 'react';
import { X, User, Trash2, Plus, Save, GripHorizontal } from 'lucide-react';
import { useDraggable } from '../hooks/useDraggable';
import { PlayerNoteData, PlayerNoteEntry } from './PlayerNoteModal';

const LABEL_COLORS: Record<string, string> = {
  Fish: 'bg-blue-600', Reg: 'bg-slate-600', Nit: 'bg-slate-700',
  TAG: 'bg-emerald-700', LAG: 'bg-orange-600', Maniac: 'bg-red-600',
  Aggro: 'bg-amber-600', Passivo: 'bg-indigo-600',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000)    return 'agora';
  if (diff < 3_600_000) return `há ${Math.floor(diff / 60_000)}min`;
  if (diff < 86_400_000) return `há ${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  playerName: string;
  data: PlayerNoteData;
  onSave: (playerName: string, data: PlayerNoteData) => void;
  onClose: () => void;
}

const PlayerNoteHistory: React.FC<Props> = ({ playerName, data, onSave, onClose }) => {
  const { pos, handleMouseDown } = useDraggable({ x: 20, y: 120 });
  const [newNote, setNewNote] = useState('');
  const [entries, setEntries] = useState<PlayerNoteEntry[]>([...data.entries].reverse()); // newest first

  const deleteEntry = (idx: number) => {
    // idx is in reversed order; real index = entries.length - 1 - idx
    const realIdx = entries.length - 1 - idx;
    const updated = data.entries.filter((_, i) => i !== realIdx);
    setEntries([...updated].reverse());
    onSave(playerName, { ...data, entries: updated });
  };

  const addEntry = () => {
    const trimmed = newNote.trim();
    if (!trimmed) return;
    const entry: PlayerNoteEntry = { text: trimmed, createdAt: new Date().toISOString() };
    const updated = [...data.entries, entry];
    setEntries([...updated].reverse());
    onSave(playerName, { ...data, entries: updated });
    setNewNote('');
  };

  return (
    <div
      className="fixed z-[650] w-72 bg-[#0a0f1a]/98 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Drag handle / Header */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between px-3 py-2.5 bg-white/[0.03] border-b border-white/5 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={12} className="text-slate-600" />
          <User size={11} className="text-purple-400" />
          <span className="text-[11px] font-black uppercase text-white truncate max-w-[130px]">{playerName}</span>
          {data.label && (
            <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full text-white ${LABEL_COLORS[data.label] ?? 'bg-slate-600'}`}>
              {data.label}
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors shrink-0">
          <X size={13} />
        </button>
      </div>

      {/* Notes list */}
      <div className="max-h-72 overflow-y-auto custom-scrollbar">
        {entries.length === 0 ? (
          <div className="px-4 py-6 text-center text-slate-600 text-[11px]">Nenhuma nota ainda</div>
        ) : (
          entries.map((entry, i) => (
            <div key={i} className={`px-3 py-2.5 ${i > 0 ? 'border-t border-white/[0.04]' : ''} group`}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[9px] text-slate-500 mt-0.5 shrink-0">{fmtDate(entry.createdAt)}</span>
                <button
                  onClick={() => deleteEntry(i)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-600 hover:text-red-400 transition-all shrink-0"
                >
                  <Trash2 size={10} />
                </button>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed mt-1 whitespace-pre-wrap">{entry.text}</p>
            </div>
          ))
        )}
      </div>

      {/* Add note */}
      <div className="border-t border-white/5 p-2.5 flex gap-1.5">
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addEntry(); }}
          placeholder="Nova nota… (Ctrl+Enter)"
          rows={2}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 text-[10px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-purple-500/40 resize-none transition-colors"
        />
        <button
          onClick={addEntry}
          disabled={!newNote.trim()}
          className="self-end p-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 rounded-xl text-white transition-all"
          title="Salvar nota"
        >
          {newNote.trim() ? <Save size={12} /> : <Plus size={12} />}
        </button>
      </div>
    </div>
  );
};

export default PlayerNoteHistory;
