
import React, { useState } from 'react';
import { X, Calculator } from 'lucide-react';

type CalcTab = 'potodds' | 'mdf' | 'blefes';

interface Props {
  currentPot?: number;
  bigBlindValue: number;
  displayMode: 'chips' | 'bb';
  onClose: () => void;
}

const PotOddsWidget: React.FC<Props> = ({ currentPot = 0, bigBlindValue, displayMode, onClose }) => {
  const [tab, setTab]   = useState<CalcTab>('potodds');
  const [pot, setPot]   = useState(currentPot > 0 ? String(Math.round(currentPot)) : '');
  const [bet, setBet]   = useState('');

  const toDisplay = (v: number) =>
    displayMode === 'bb' ? `${(v / bigBlindValue).toFixed(1)}bb` : v.toLocaleString();

  const potNum = parseFloat(pot) || 0;
  const betNum = parseFloat(bet) || 0;
  const hasInputs = potNum > 0 && betNum > 0;

  // ── POT ODDS ──────────────────────────────────────────────
  const equityNeeded = hasInputs ? (betNum / (potNum + betNum * 2)) * 100 : null;
  const oddsRatio    = hasInputs ? `${betNum.toLocaleString()} : ${(potNum + betNum).toLocaleString()}` : null;
  const poEval       = equityNeeded === null ? null : equityNeeded < 25 ? 'good' : equityNeeded < 35 ? 'ok' : 'tight';
  const poColor      = poEval === 'good' ? 'text-emerald-400' : poEval === 'ok' ? 'text-amber-400' : 'text-red-400';
  const poLabel      = poEval === 'good' ? 'Pot favorável' : poEval === 'ok' ? 'Marginal' : 'Precisa de equity';

  // ── MDF ───────────────────────────────────────────────────
  // MDF = Pot / (Bet + Pot)  →  minimum % of range to defend
  const mdf        = hasInputs ? (potNum / (betNum + potNum)) * 100 : null;
  const mdfFold    = mdf !== null ? 100 - mdf : null;
  const mdfEval    = mdf === null ? null : mdf > 60 ? 'high' : mdf > 40 ? 'mid' : 'low';
  const mdfColor   = mdfEval === 'high' ? 'text-red-400' : mdfEval === 'mid' ? 'text-amber-400' : 'text-emerald-400';
  const mdfLabel   = mdfEval === 'high' ? 'Aposta grande — defender pouco' : mdfEval === 'mid' ? 'Aposta média' : 'Aposta pequena — defender mais';

  // ── BLEFES ────────────────────────────────────────────────
  // Bluff = Bet / (Bet + Pot)  →  % that bluff needs to work
  const bluffFreq  = hasInputs ? (betNum / (betNum + potNum)) * 100 : null;
  const bluffEval  = bluffFreq === null ? null : bluffFreq < 30 ? 'easy' : bluffFreq < 50 ? 'mid' : 'hard';
  const bluffColor = bluffEval === 'easy' ? 'text-emerald-400' : bluffEval === 'mid' ? 'text-amber-400' : 'text-red-400';
  const bluffLabel = bluffEval === 'easy' ? 'Blefe de baixo risco' : bluffEval === 'mid' ? 'Risco moderado' : 'Precisa funcionar muitas vezes';

  const TABS: { key: CalcTab; label: string }[] = [
    { key: 'potodds', label: 'Pot Odds' },
    { key: 'mdf',     label: 'MDF' },
    { key: 'blefes',  label: 'Blefes' },
  ];

  return (
    <div className="bg-[#0a0f1a]/98 border border-white/20 rounded-2xl shadow-2xl w-56 backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Calculator size={12} className="text-blue-400" />
          <span className="text-[9px] font-black text-white uppercase tracking-widest">Calculadoras</span>
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-white/10 rounded-md text-slate-500 hover:text-white transition-colors"><X size={12} /></button>
      </div>

      {/* Tab selector */}
      <div className="flex border-b border-white/5">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-wide transition-colors border-b-2 ${tab === key ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-600 hover:text-slate-400'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-2.5">
        {/* Inputs — shared across all tabs */}
        <div className="space-y-1.5">
          <div>
            <label className="text-[7px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">Pot atual</label>
            <input type="number" value={pot} onChange={e => setPot(e.target.value)} placeholder="Ex: 100"
              className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white placeholder:text-slate-700 outline-none focus:border-blue-500/50 transition-colors" />
          </div>
          <div>
            <label className="text-[7px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">
              {tab === 'potodds' ? 'Call (quanto custa)' : 'Aposta'}
            </label>
            <input type="number" value={bet} onChange={e => setBet(e.target.value)} placeholder="Ex: 50"
              className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white placeholder:text-slate-700 outline-none focus:border-blue-500/50 transition-colors" />
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* ── POT ODDS results */}
        {tab === 'potodds' && (
          hasInputs && equityNeeded !== null ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[8px] text-slate-500 font-bold uppercase">Pot Odds</span>
                <span className="text-[10px] font-black text-white font-mono">{oddsRatio}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[8px] text-slate-500 font-bold uppercase">Equity mín.</span>
                <span className={`text-[18px] font-black ${poColor}`}>{equityNeeded.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${poEval === 'good' ? 'bg-emerald-500' : poEval === 'ok' ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(equityNeeded, 100)}%` }} />
              </div>
              <div className={`text-[8px] font-black uppercase text-center ${poColor}`}>{poLabel}</div>
              {displayMode === 'bb' && <div className="text-[7px] text-slate-600 text-center">{toDisplay(potNum)} pot · {toDisplay(betNum)} bet</div>}
            </div>
          ) : <div className="text-[8px] text-slate-600 text-center py-1">Insira pot e call para calcular</div>
        )}

        {/* ── MDF results */}
        {tab === 'mdf' && (
          hasInputs && mdf !== null ? (
            <div className="space-y-2">
              <div className="text-[7px] text-slate-600 text-center mb-1">Fórmula: Pot ÷ (Aposta + Pot)</div>
              <div className="flex justify-between items-center">
                <span className="text-[8px] text-slate-500 font-bold uppercase">Defender ≥</span>
                <span className={`text-[18px] font-black ${mdfColor}`}>{mdf.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[8px] text-slate-500 font-bold uppercase">Pode foldar</span>
                <span className="text-[13px] font-black text-slate-400">{mdfFold!.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${mdfEval === 'high' ? 'bg-red-500' : mdfEval === 'mid' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(mdf, 100)}%` }} />
              </div>
              <div className={`text-[8px] font-black uppercase text-center ${mdfColor}`}>{mdfLabel}</div>
            </div>
          ) : <div className="text-[8px] text-slate-600 text-center py-1">Insira pot e aposta para calcular</div>
        )}

        {/* ── BLEFES results */}
        {tab === 'blefes' && (
          hasInputs && bluffFreq !== null ? (
            <div className="space-y-2">
              <div className="text-[7px] text-slate-600 text-center mb-1">Fórmula: Aposta ÷ (Aposta + Pot)</div>
              <div className="flex justify-between items-center">
                <span className="text-[8px] text-slate-500 font-bold uppercase">Precisar funcionar</span>
                <span className={`text-[18px] font-black ${bluffColor}`}>{bluffFreq.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[8px] text-slate-500 font-bold uppercase">Margem de falha</span>
                <span className="text-[13px] font-black text-slate-400">{(100 - bluffFreq).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${bluffEval === 'easy' ? 'bg-emerald-500' : bluffEval === 'mid' ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(bluffFreq, 100)}%` }} />
              </div>
              <div className={`text-[8px] font-black uppercase text-center ${bluffColor}`}>{bluffLabel}</div>
            </div>
          ) : <div className="text-[8px] text-slate-600 text-center py-1">Insira pot e aposta para calcular</div>
        )}
      </div>
    </div>
  );
};

export default PotOddsWidget;
