
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Star, Plus, X } from 'lucide-react';
import { HandNote } from '../types';

const PRESET_TAGS: { label: string; color: string; active: string }[] = [
  { label: 'Bluff',     color: 'text-red-400 border-red-500/30',       active: 'bg-red-500/20 border-red-400 text-red-300' },
  { label: 'Hero Call', color: 'text-emerald-400 border-emerald-500/30', active: 'bg-emerald-500/20 border-emerald-400 text-emerald-300' },
  { label: 'Erro',      color: 'text-amber-400 border-amber-500/30',    active: 'bg-amber-500/20 border-amber-400 text-amber-300' },
  { label: 'Spot',      color: 'text-blue-400 border-blue-500/30',      active: 'bg-blue-500/20 border-blue-400 text-blue-300' },
  { label: 'Estudar',   color: 'text-purple-400 border-purple-500/30',  active: 'bg-purple-500/20 border-purple-400 text-purple-300' },
  { label: 'All-in',    color: 'text-orange-400 border-orange-500/30',  active: 'bg-orange-500/20 border-orange-400 text-orange-300' },
  { label: 'Value',     color: 'text-cyan-400 border-cyan-500/30',      active: 'bg-cyan-500/20 border-cyan-400 text-cyan-300' },
];

const CUSTOM_TAG_STYLE = 'text-indigo-400 border-indigo-500/30';
const CUSTOM_TAG_ACTIVE = 'bg-indigo-500/20 border-indigo-400 text-indigo-300';

const EMPTY: HandNote = { text: '', tags: [], starred: false };

interface HandNotesProps {
  handKey: string;
  note: HandNote | undefined;
  onChange: (key: string, note: HandNote) => void;
  customTags?: string[];
  onCreateTag?: (name: string) => void;
}

const HandNotes: React.FC<HandNotesProps> = ({ handKey, note, onChange, customTags = [], onCreateTag }) => {
  const current = note ?? EMPTY;
  const [adding, setAdding] = useState(false);
  const [newTag, setNewTag] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  const toggleStar = useCallback(() => {
    onChange(handKey, { ...current, starred: !current.starred });
  }, [handKey, current, onChange]);

  const toggleTag = useCallback((tag: string) => {
    const tags = current.tags.includes(tag)
      ? current.tags.filter(t => t !== tag)
      : [...current.tags, tag];
    onChange(handKey, { ...current, tags });
  }, [handKey, current, onChange]);

  const updateText = useCallback((text: string) => {
    onChange(handKey, { ...current, text });
  }, [handKey, current, onChange]);

  const commitNewTag = () => {
    const name = newTag.trim();
    if (name && onCreateTag) { onCreateTag(name); toggleTag(name); }
    setNewTag('');
    setAdding(false);
  };

  const allTags = [...PRESET_TAGS.map(t => t.label), ...customTags];

  return (
    <div className="flex flex-col gap-2 px-3 py-2.5 border-t border-white/5">
      {/* Tags row */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={toggleStar}
          className={`shrink-0 p-1 rounded-md transition-all ${current.starred ? 'text-amber-400 bg-amber-400/10' : 'text-slate-600 hover:text-amber-400'}`}
        >
          <Star size={12} fill={current.starred ? 'currentColor' : 'none'} />
        </button>

        {/* Preset tags */}
        {PRESET_TAGS.map(({ label, color, active }) => {
          const isActive = current.tags.includes(label);
          return (
            <button key={label} onClick={() => toggleTag(label)}
              className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border transition-all ${isActive ? active : `border ${color} bg-transparent hover:opacity-90`}`}>
              {label}
            </button>
          );
        })}

        {/* Custom tags */}
        {customTags.map(label => {
          const isActive = current.tags.includes(label);
          return (
            <button key={label} onClick={() => toggleTag(label)}
              className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border transition-all ${isActive ? CUSTOM_TAG_ACTIVE : `border ${CUSTOM_TAG_STYLE} bg-transparent hover:opacity-90`}`}>
              {label}
            </button>
          );
        })}

        {/* Add tag button */}
        {adding ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitNewTag(); if (e.key === 'Escape') { setAdding(false); setNewTag(''); } }}
              placeholder="Nome da tag…"
              className="bg-white/10 border border-indigo-500/40 rounded-md px-2 py-0.5 text-[8px] text-white placeholder:text-slate-600 outline-none w-24"
            />
            <button onClick={commitNewTag} className="text-[8px] px-1.5 py-0.5 bg-indigo-600 text-white rounded-md font-black">OK</button>
            <button onClick={() => { setAdding(false); setNewTag(''); }} className="text-slate-500 hover:text-white"><X size={10} /></button>
          </div>
        ) : (
          onCreateTag && (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-black border border-dashed border-white/15 text-slate-600 hover:text-indigo-400 hover:border-indigo-500/40 transition-all">
              <Plus size={9} /> Tag
            </button>
          )
        )}
      </div>

      {/* Notes textarea */}
      <textarea
        value={current.text}
        onChange={e => updateText(e.target.value)}
        placeholder="Anotação sobre essa mão…"
        rows={2}
        className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-300 placeholder:text-slate-700 outline-none focus:border-blue-500/40 resize-none transition-colors leading-relaxed custom-scrollbar"
      />
    </div>
  );
};

export default HandNotes;
