
import React, { useState } from 'react';
import { X, SlidersHorizontal, Check, Tag } from 'lucide-react';

type SidebarFilter = 'all' | 'win' | 'lose' | 'fold' | 'star' | 'vpip' | 'pfr' | '3bet' | 'call';

export type NumericOp = 'gt' | 'lt' | 'eq' | 'between';

export interface NumericFilter {
  op: NumericOp;
  val: number;
  val2?: number; // only for 'between'
}

interface FilterModalProps {
  sidebarFilter: SidebarFilter;
  positionFilter: string;
  tagFilter: string;
  stackBBFilter: NumericFilter | null;
  bbValueFilter: NumericFilter | null;
  customTags: string[];
  onApply: (
    filter: SidebarFilter,
    position: string,
    tagFilter: string,
    stackBBFilter: NumericFilter | null,
    bbValueFilter: NumericFilter | null,
  ) => void;
  onClose: () => void;
}

const POSITIONS = ['BTN', 'CO', 'HJ', 'LJ', 'MP', 'SB', 'BB', 'UTG'];
const OPS: { key: NumericOp; label: string }[] = [
  { key: 'gt', label: '>' },
  { key: 'lt', label: '<' },
  { key: 'eq', label: '=' },
  { key: 'between', label: 'entre' },
];

// ── Local state for one numeric filter ────────────────────────────────────────
interface NumericState { op: NumericOp; val: string; val2: string; }
function initNum(f: NumericFilter | null): NumericState {
  if (!f) return { op: 'lt', val: '', val2: '' };
  return { op: f.op, val: String(f.val), val2: String(f.val2 ?? '') };
}
function toFilter(s: NumericState): NumericFilter | null {
  const v = parseFloat(s.val);
  if (isNaN(v) || s.val === '') return null;
  if (s.op === 'between') {
    const v2 = parseFloat(s.val2);
    if (isNaN(v2) || s.val2 === '') return null;
    return { op: 'between', val: Math.min(v, v2), val2: Math.max(v, v2) };
  }
  return { op: s.op, val: v };
}
function isActive(s: NumericState) { return s.val !== ''; }

const FilterModal: React.FC<FilterModalProps> = ({
  sidebarFilter, positionFilter, tagFilter, stackBBFilter, bbValueFilter, customTags, onApply, onClose,
}) => {
  const [filter,   setFilter]   = useState<SidebarFilter>(sidebarFilter);
  const [position, setPosition] = useState(positionFilter);
  const [tag,      setTag]      = useState(tagFilter);
  const [stack,    setStack]    = useState<NumericState>(initNum(stackBBFilter));
  const [bb,       setBB]       = useState<NumericState>(initNum(bbValueFilter));

  const apply = () => {
    onApply(filter, position, tag, toFilter(stack), toFilter(bb));
    onClose();
  };
  const clear = () => {
    setFilter('all'); setPosition(''); setTag('');
    setStack({ op: 'lt', val: '', val2: '' });
    setBB({ op: 'lt', val: '', val2: '' });
  };

  const activeCount =
    (filter !== 'all' ? 1 : 0) +
    (position         ? 1 : 0) +
    (tag              ? 1 : 0) +
    (isActive(stack)  ? 1 : 0) +
    (isActive(bb)     ? 1 : 0);

  const Chip = ({
    label, value, active, color = 'blue',
  }: { label: string; value: SidebarFilter; active: boolean; color?: string }) => {
    const colors: Record<string, string> = {
      blue:    active ? 'bg-blue-600 text-white border-blue-600'      : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white',
      emerald: active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white',
      red:     active ? 'bg-red-600 text-white border-red-600'        : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white',
      slate:   active ? 'bg-slate-600 text-white border-slate-600'    : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white',
      amber:   active ? 'bg-amber-500 text-black border-amber-500'    : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white',
    };
    return (
      <button
        onClick={() => setFilter(filter === value ? 'all' : value)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all ${colors[color]}`}
      >
        {active && <Check size={10} />}
        {label}
      </button>
    );
  };

  const PosChip = ({ pos }: { pos: string }) => (
    <button
      onClick={() => setPosition(position === pos ? '' : pos)}
      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
        position === pos
          ? 'bg-purple-600 text-white border-purple-600'
          : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
      }`}
    >
      {pos}
    </button>
  );

  // ── Numeric filter block ─────────────────────────────────────────────────
  const NumericBlock = ({
    label, state, onChange, placeholder, placeholder2,
  }: {
    label: string;
    state: NumericState;
    onChange: (s: NumericState) => void;
    placeholder: string;
    placeholder2: string;
  }) => (
    <div className="space-y-2">
      <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider">{label}</p>
      {/* Operator chips */}
      <div className="flex gap-1.5">
        {OPS.map(o => (
          <button
            key={o.key}
            onClick={() => onChange({ ...state, op: o.key })}
            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black border transition-all ${
              state.op === o.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {/* Value input(s) */}
      {state.op === 'between' ? (
        <div className="flex items-center gap-2">
          <input
            type="number" min="0" placeholder={placeholder}
            value={state.val}
            onChange={e => onChange({ ...state, val: e.target.value })}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
          />
          <span className="text-[9px] text-slate-600 font-bold shrink-0">e</span>
          <input
            type="number" min="0" placeholder={placeholder2}
            value={state.val2}
            onChange={e => onChange({ ...state, val2: e.target.value })}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
          />
          {(state.val || state.val2) && (
            <button onClick={() => onChange({ ...state, val: '', val2: '' })} className="text-slate-500 hover:text-white text-[10px] shrink-0">✕</button>
          )}
        </div>
      ) : (
        <div className="relative">
          <input
            type="number" min="0" placeholder={placeholder}
            value={state.val}
            onChange={e => onChange({ ...state, val: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
          />
          {state.val && (
            <button onClick={() => onChange({ ...state, val: '' })} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-[10px]">✕</button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-[#0a0f1a] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-blue-400" />
            <h2 className="text-sm font-black uppercase text-white">Filtros</h2>
            {activeCount > 0 && (
              <span className="text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded-full">{activeCount}</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Resultado */}
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Resultado</p>
            <div className="flex flex-wrap gap-2">
              <Chip label="Todas"       value="all"  active={filter === 'all'}  color="blue" />
              <Chip label="Ganhou"      value="win"  active={filter === 'win'}  color="emerald" />
              <Chip label="Perdeu"      value="lose" active={filter === 'lose'} color="red" />
              <Chip label="Foldou"      value="fold" active={filter === 'fold'} color="slate" />
              <Chip label="★ Favoritas" value="star" active={filter === 'star'} color="amber" />
            </div>
          </div>

          {/* Ação do Hero */}
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Ação do Hero (Pré-flop)</p>
            <div className="flex flex-wrap gap-2">
              <Chip label="VPIP"  value="vpip" active={filter === 'vpip'} color="blue" />
              <Chip label="PFR"   value="pfr"  active={filter === 'pfr'}  color="blue" />
              <Chip label="3-Bet" value="3bet" active={filter === '3bet'} color="blue" />
              <Chip label="Call"  value="call" active={filter === 'call'} color="blue" />
            </div>
          </div>

          {/* Posição */}
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Posição do Hero</p>
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map(p => <PosChip key={p} pos={p} />)}
            </div>
          </div>

          {/* Stack efetivo do Hero (em BB) */}
          <NumericBlock
            label="Stack efetivo do Hero (BB)"
            state={stack}
            onChange={setStack}
            placeholder="Ex: 30"
            placeholder2="Ex: 100"
          />

          {/* Valor do Big Blind (fichas) */}
          <NumericBlock
            label="Valor do Big Blind (fichas)"
            state={bb}
            onChange={setBB}
            placeholder="Ex: 100"
            placeholder2="Ex: 500"
          />

          {/* Tags personalizadas */}
          {customTags.length > 0 && (
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Tag size={10} /> Minhas Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {customTags.map(t => (
                  <button key={t}
                    onClick={() => setTag(tag === t ? '' : t)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
                      tag === t
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {tag === t && <Check size={10} />}
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-2">
          <button onClick={clear}
            className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all">
            Limpar filtros
          </button>
          <button onClick={apply}
            className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg">
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
