
import React from 'react';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { HandHistory } from '../types';
import { buildHandSummary } from '../utils/handSummary';
import Card from './Card';

const SUIT_SYMBOL: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
function fmtCard(code: string) {
  if (!code || code.length < 2) return code;
  return `${code[0]}${SUIT_SYMBOL[code[1]] ?? code[1]}`;
}

const ACTION_LABELS: Record<string, string> = {
  FOLD: 'fold', CHECK: 'check', CALL: 'call', BET: 'bet', RAISE: 'raise',
};
const ACTION_COLORS: Record<string, string> = {
  FOLD: 'text-slate-500',
  CHECK: 'text-slate-400',
  CALL: 'text-blue-400',
  BET: 'text-amber-400',
  RAISE: 'text-orange-400',
};
const STREET_LABELS: Record<string, string> = {
  PREFLOP: 'Pré-Flop', FLOP: 'Flop', TURN: 'Turn', RIVER: 'River', SHOWDOWN: 'Showdown',
};

interface HandSummaryProps {
  hand: HandHistory;
  bigBlindValue: number;
  displayMode: 'chips' | 'bb';
  onClose: () => void;
}

const HandSummary: React.FC<HandSummaryProps> = ({ hand, bigBlindValue, displayMode, onClose }) => {
  const data = buildHandSummary(hand, bigBlindValue, displayMode);

  const fmt = (amount: number) =>
    displayMode === 'bb'
      ? `${(amount / bigBlindValue).toFixed(1)}bb`
      : amount.toLocaleString();

  const resultIcon =
    data.result === 'win'  ? <TrendingUp  size={18} className="text-emerald-400" /> :
    data.result === 'lose' ? <TrendingDown size={18} className="text-red-400" />    :
                             <Minus        size={18} className="text-slate-500" />;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl bg-[#0a0f1a] border border-white/10 rounded-[2rem] p-7 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black uppercase italic text-white">Resumo da Mão</h2>
            <p className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-widest">{hand.room} · {hand.stakes} · #{hand.id.slice(0, 10)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Hero cards + result */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-white/5 border border-white/10 rounded-2xl">
          <div className="flex items-center gap-1">
            {data.heroCards.map((c, i) => (
              <Card key={i} code={c} size="sm" />
            ))}
          </div>
          <div>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">{data.heroName} · {data.heroPos}</span>
            <div className="flex items-center gap-1.5 mt-1">
              {resultIcon}
              <span className={`text-[13px] font-black uppercase ${data.result === 'win' ? 'text-emerald-400' : data.result === 'lose' ? 'text-red-400' : 'text-slate-500'}`}>
                {data.result === 'win' ? 'Ganhou' : data.result === 'lose' ? 'Perdeu' : 'Foldou'}
              </span>
            </div>
          </div>
        </div>

        {/* Streets */}
        <div className="space-y-3">
          {data.streets.map(st => (
            <div key={st.street} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
              {/* Street header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">{STREET_LABELS[st.street] ?? st.street}</span>
                {st.board.length > 0 && (
                  <div className="flex items-center gap-1">
                    {st.board.map((c, i) => (
                      <span key={i} className={`text-[13px] font-black font-mono ${c[1] === 'h' || c[1] === 'd' ? 'text-red-400' : 'text-slate-200'}`}>
                        {fmtCard(c)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-x-2 gap-y-1.5">
                {st.lines.map((line, i) => {
                  const name = line.isHero ? 'Hero' : line.playerName.length > 10 ? line.playerName.slice(0, 9) + '…' : line.playerName;
                  const label = ACTION_LABELS[line.type] ?? line.type.toLowerCase();
                  const color = ACTION_COLORS[line.type] ?? 'text-slate-400';
                  const amtStr = line.amount != null && line.amount > 0 && (line.type === 'BET' || line.type === 'RAISE' || line.type === 'CALL')
                    ? ` ${fmt(line.amount)}`
                    : '';
                  return (
                    <span key={i} className="text-[11px] font-bold">
                      <span className={line.isHero ? 'text-blue-300 font-black' : 'text-slate-400'}>{name}</span>
                      {' '}
                      <span className={color}>{label}{amtStr}</span>
                      {i < st.lines.length - 1 && <span className="text-slate-700 ml-2">·</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* All players' cards if revealed */}
        {hand.actions.some(a => a.type === 'SHOWS') && (
          <div className="mt-5 pt-5 border-t border-white/5">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Showdown</span>
            <div className="flex flex-wrap gap-4">
              {hand.players.map(p => {
                const shown = hand.actions.find(a => a.type === 'SHOWS' && a.playerName === p.name);
                if (!shown?.cards?.length && !p.cards?.length) return null;
                const cards = shown?.cards ?? p.cards ?? [];
                return (
                  <div key={p.name} className="flex items-center gap-2">
                    <span className={`text-[11px] font-black uppercase ${p.isHero ? 'text-blue-400' : 'text-slate-400'}`}>{p.isHero ? 'Hero' : p.name.slice(0, 8)}</span>
                    <div className="flex gap-0.5">
                      {cards.map((c, i) => (
                        <Card key={i} code={c} size="sm" />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HandSummary;
