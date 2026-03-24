
import React, { useState, useCallback, useMemo } from 'react';
import { X, Trash2 } from 'lucide-react';

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

type RangeCategory = 'value' | 'bluff' | 'call' | 'mixed';

interface RangeBuilderProps {
  onClose: () => void;
}

const CATEGORIES: { key: RangeCategory; label: string; bg: string; border: string; text: string }[] = [
  { key: 'value', label: 'Value',  bg: 'bg-emerald-500/20', border: 'border-emerald-400', text: 'text-emerald-300' },
  { key: 'bluff', label: 'Bluff',  bg: 'bg-red-500/20',     border: 'border-red-400',     text: 'text-red-300'     },
  { key: 'call',  label: 'Call',   bg: 'bg-blue-500/20',    border: 'border-blue-400',    text: 'text-blue-300'    },
  { key: 'mixed', label: 'Mixed',  bg: 'bg-amber-500/20',   border: 'border-amber-400',   text: 'text-amber-300'   },
];

const CELL_BG: Record<RangeCategory, string> = {
  value: 'bg-emerald-500/30 border-emerald-500/50 text-emerald-200',
  bluff: 'bg-red-500/30 border-red-500/50 text-red-200',
  call:  'bg-blue-500/30 border-blue-500/50 text-blue-200',
  mixed: 'bg-amber-500/30 border-amber-500/50 text-amber-200',
};

function handName(r: number, c: number): string {
  if (r === c) return RANKS[r] + RANKS[r];
  if (r < c)   return RANKS[r] + RANKS[c] + 's';
  return RANKS[c] + RANKS[r] + 'o';
}

function combos(r: number, c: number): number {
  if (r === c) return 6;
  if (r < c)   return 4;
  return 12;
}

const TOTAL_COMBOS = 1326;

const RangeBuilder: React.FC<RangeBuilderProps> = ({ onClose }) => {
  const [range, setRange] = useState<Record<string, RangeCategory>>({});
  const [activeCategory, setActiveCategory] = useState<RangeCategory>('value');
  const [isDragging, setIsDragging] = useState(false);

  const toggleCell = useCallback((r: number, c: number) => {
    const key = handName(r, c);
    setRange(prev => {
      const next = { ...prev };
      if (next[key] === activeCategory) delete next[key];
      else next[key] = activeCategory;
      return next;
    });
  }, [activeCategory]);

  const handleMouseEnter = useCallback((r: number, c: number) => {
    if (!isDragging) return;
    const key = handName(r, c);
    setRange(prev => {
      if (prev[key] === activeCategory) return prev;
      return { ...prev, [key]: activeCategory };
    });
  }, [isDragging, activeCategory]);

  const stats = useMemo(() => {
    let total = 0;
    const byCat: Record<RangeCategory, number> = { value: 0, bluff: 0, call: 0, mixed: 0 };
    for (const [key, cat] of Object.entries(range)) {
      const r = Math.floor(RANKS.findIndex(rk => key.startsWith(rk)));
      // derive combos from hand type
      const isPair = key.length === 2 && key[0] === key[1];
      const isSuited = key.endsWith('s');
      const c = isPair ? 6 : isSuited ? 4 : 12;
      total += c;
      byCat[cat] += c;
    }
    return { total, pct: ((total / TOTAL_COMBOS) * 100).toFixed(1), byCat };
  }, [range]);

  return (
    <div
      className="bg-[#0a0f1a]/98 border border-white/20 rounded-2xl shadow-2xl backdrop-blur-xl select-none"
      style={{ width: 420 }}
      onMouseLeave={() => setIsDragging(false)}
      onMouseUp={() => setIsDragging(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-[9px] font-black text-white uppercase tracking-widest">Range Builder</span>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-black text-blue-400">{stats.pct}% ({stats.total} combos)</span>
          <button onClick={() => setRange({})} title="Limpar" className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 size={12} />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-white transition-colors">
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Category selector */}
      <div className="flex gap-1.5 px-4 py-2.5 border-b border-white/5">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex-1 py-1 rounded-lg text-[8px] font-black uppercase border transition-all ${
              activeCategory === cat.key
                ? `${cat.bg} ${cat.border} ${cat.text}`
                : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="p-3">
        {/* Rank labels top */}
        <div className="grid mb-0.5" style={{ gridTemplateColumns: `16px repeat(13, 1fr)` }}>
          <div />
          {RANKS.map(r => (
            <div key={r} className="text-center text-[6px] font-black text-slate-500 uppercase">{r}</div>
          ))}
        </div>

        {RANKS.map((rowRank, r) => (
          <div key={rowRank} className="grid items-center" style={{ gridTemplateColumns: `16px repeat(13, 1fr)` }}>
            {/* Rank label left */}
            <div className="text-[6px] font-black text-slate-500 uppercase flex items-center justify-center h-full">{rowRank}</div>

            {RANKS.map((_, c) => {
              const key = handName(r, c);
              const cat = range[key];
              const isPair   = r === c;
              const isSuited = r < c;
              return (
                <div
                  key={key}
                  onMouseDown={() => { setIsDragging(true); toggleCell(r, c); }}
                  onMouseEnter={() => handleMouseEnter(r, c)}
                  className={`
                    relative m-[1px] rounded-[3px] aspect-square flex items-center justify-center cursor-pointer
                    border transition-all duration-75
                    ${cat ? CELL_BG[cat] : isPair ? 'bg-slate-700/40 border-slate-600/30 hover:bg-slate-600/40' : isSuited ? 'bg-slate-800/60 border-slate-700/20 hover:bg-slate-700/40' : 'bg-slate-900/60 border-slate-800/20 hover:bg-slate-800/40'}
                  `}
                >
                  <span className={`text-[5.5px] font-black leading-none ${cat ? '' : 'text-slate-500'}`}>
                    {key}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between px-4 pb-3 pt-1">
        <div className="flex gap-3">
          {CATEGORIES.map(cat => (
            <span key={cat.key} className={`text-[7px] font-black uppercase ${cat.text}`}>
              {cat.label} {stats.byCat[cat.key] > 0 ? `${stats.byCat[cat.key]}` : ''}
            </span>
          ))}
        </div>
        <div className="flex gap-2 text-[7px] text-slate-600 font-bold">
          <span className="text-slate-500">■ Pair</span>
          <span className="text-slate-600">■ s</span>
          <span className="text-slate-700">■ o</span>
        </div>
      </div>
    </div>
  );
};

export default RangeBuilder;
