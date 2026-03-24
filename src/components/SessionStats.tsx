
import React, { useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { HandHistory } from '../types';

interface SessionStatsProps {
  hands: HandHistory[];
  onClose: () => void;
}

const POS_ORDER = ['BTN/SB', 'BTN', 'CO', 'HJ', 'LJ', 'MP', 'UTG', 'SB', 'BB'];

const SessionStats: React.FC<SessionStatsProps> = ({ hands, onClose }) => {
  const stats = useMemo(() => {
    const heroHands = hands.filter(h => h.players.some(p => p.isHero));
    const total = heroHands.length;
    if (total === 0) return null;

    let wins = 0, losses = 0, folds = 0;
    let vpip = 0, pfr = 0;
    const byPos: Record<string, { hands: number; wins: number; losses: number }> = {};
    const byRoom: Record<string, number> = {};

    heroHands.forEach(hand => {
      const hero = hand.players.find(p => p.isHero)!;
      const status = hand.summary.heroStatus;

      if (status === 'win')  wins++;
      else if (status === 'lose') losses++;
      else folds++;

      // VPIP: hero called or raised preflop (excluding blinds)
      const heroPreflopActions = hand.actions.filter(a => a.playerName === hero.name && a.street === 'PREFLOP');
      const didVPIP = heroPreflopActions.some(a => a.type === 'CALL' || a.type === 'RAISE');
      const didPFR  = heroPreflopActions.some(a => a.type === 'RAISE');
      if (didVPIP) vpip++;
      if (didPFR)  pfr++;

      // By position
      const pos = hero.position || 'UNK';
      if (!byPos[pos]) byPos[pos] = { hands: 0, wins: 0, losses: 0 };
      byPos[pos].hands++;
      if (status === 'win')  byPos[pos].wins++;
      if (status === 'lose') byPos[pos].losses++;

      // By room
      byRoom[hand.room] = (byRoom[hand.room] || 0) + 1;
    });

    const posRows = POS_ORDER
      .filter(pos => byPos[pos])
      .map(pos => ({ pos, ...byPos[pos], winPct: Math.round((byPos[pos].wins / byPos[pos].hands) * 100) }));

    // Add any positions not in POS_ORDER
    Object.entries(byPos).forEach(([pos, data]) => {
      if (!POS_ORDER.includes(pos)) posRows.push({ pos, ...data, winPct: Math.round((data.wins / data.hands) * 100) });
    });

    return {
      total,
      wins, losses, folds,
      winPct:  Math.round((wins  / total) * 100),
      lossPct: Math.round((losses / total) * 100),
      foldPct: Math.round((folds  / total) * 100),
      vpipPct: Math.round((vpip / total) * 100),
      pfrPct:  Math.round((pfr  / total) * 100),
      posRows,
      byRoom,
    };
  }, [hands]);

  if (!stats) return null;

  const StatCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      <span className="text-2xl font-black text-white leading-none">{value}</span>
      {sub && <span className="text-[9px] text-slate-500">{sub}</span>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl bg-[#0a0f1a] border border-white/10 rounded-[2rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-black uppercase italic text-white">Stats da Sessão</h2>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">{stats.total} mãos importadas</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Rooms pill */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(stats.byRoom).map(([room, count]) => (
            <span key={room} className="bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[8px] font-black uppercase px-2.5 py-1 rounded-full">
              {room} · {count}
            </span>
          ))}
        </div>

        {/* Main stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="VPIP" value={`${stats.vpipPct}%`} sub="voluntário preflop" />
          <StatCard label="PFR"  value={`${stats.pfrPct}%`}  sub="preflop raise" />
          <StatCard label="Win Rate"  value={`${stats.winPct}%`}  sub={`${stats.wins} mãos ganhas`} />
          <StatCard label="Showdown" value={`${stats.lossPct}%`} sub={`${stats.losses} perdidas`} />
        </div>

        {/* Win / Loss / Fold breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-3">Resultados</span>
          <div className="flex gap-2 items-center mb-2">
            <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${stats.winPct}%` }} />
              <div className="h-full bg-red-500 transition-all"     style={{ width: `${stats.lossPct}%` }} />
              <div className="h-full bg-slate-600 transition-all"   style={{ width: `${stats.foldPct}%` }} />
            </div>
          </div>
          <div className="flex gap-4 text-[9px] font-bold">
            <span className="flex items-center gap-1.5 text-emerald-400"><TrendingUp size={11} /> {stats.wins} ganhas ({stats.winPct}%)</span>
            <span className="flex items-center gap-1.5 text-red-400"><TrendingDown size={11} /> {stats.losses} perdidas ({stats.lossPct}%)</span>
            <span className="flex items-center gap-1.5 text-slate-500"><Minus size={11} /> {stats.folds} foldadas ({stats.foldPct}%)</span>
          </div>
        </div>

        {/* By position table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-3">Por Posição</span>
          <div className="space-y-2">
            {stats.posRows.map(row => (
              <div key={row.pos} className="flex items-center gap-3">
                <span className="text-[9px] font-black text-blue-400 w-12 uppercase">{row.pos}</span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${row.winPct}%` }} />
                </div>
                <span className="text-[9px] font-bold text-slate-400 w-8 text-right">{row.winPct}%</span>
                <span className="text-[8px] text-slate-600 w-16 text-right">{row.wins}W / {row.hands}H</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionStats;
