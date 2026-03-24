
import React, { useState, useRef } from 'react';
import { PlayerAction } from '../types';

type AnyAction = PlayerAction | { type: 'STREET_START'; street: string };

interface TooltipState { content: string; x: number }

interface TimelineProps {
  actionsWithPauses: AnyAction[];
  currentStep: number;
  onSeek: (step: number) => void;
  heroName: string;
  bigBlindValue: number;
  displayMode: 'chips' | 'bb';
}

const ACTION_COLOR: Record<string, string> = {
  FOLD:           'bg-slate-500',
  CHECK:          'bg-slate-400',
  CALL:           'bg-blue-400',
  BET:            'bg-amber-400',
  RAISE:          'bg-orange-500',
  COLLECTED:      'bg-emerald-500',
  UNCALLED_RETURN:'bg-slate-400',
  POST_SB:        'bg-slate-600',
  POST_BB:        'bg-slate-600',
  SHOWS:          'bg-purple-400',
  MUCKS:          'bg-slate-500',
};

const ACTION_LABEL: Record<string, string> = {
  FOLD: 'fold', CHECK: 'check', CALL: 'call', BET: 'bet', RAISE: 'raise',
  COLLECTED: 'wins', UNCALLED_RETURN: 'return', POST_SB: 'post SB',
  POST_BB: 'post BB', SHOWS: 'shows', MUCKS: 'mucks',
};

const STREET_ABBR: Record<string, string> = {
  FLOP: 'FLP', TURN: 'TRN', RIVER: 'RVR', SHOWDOWN: 'SD',
};

const Timeline: React.FC<TimelineProps> = ({
  actionsWithPauses, currentStep, onSeek, heroName, bigBlindValue, displayMode,
}) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const formatAmount = (amount: number | undefined) => {
    if (!amount) return '';
    if (displayMode === 'bb') return ` ${(amount / bigBlindValue).toFixed(1)}bb`;
    return ` ${amount.toLocaleString()}`;
  };

  const handleMouseEnter = (e: React.MouseEvent, content: string) => {
    const parent = containerRef.current?.getBoundingClientRect();
    const dot = e.currentTarget.getBoundingClientRect();
    if (!parent) return;
    setTooltip({ content, x: dot.left - parent.left + dot.width / 2 });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full flex items-center gap-0.5 px-3 select-none"
      style={{ minHeight: 28 }}
      onMouseLeave={() => setTooltip(null)}
    >
      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute bottom-full mb-1.5 z-[300] bg-[#0a0f1a] border border-white/20 text-white text-[9px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-xl pointer-events-none -translate-x-1/2"
          style={{ left: tooltip.x }}
        >
          {tooltip.content}
        </div>
      )}

      {actionsWithPauses.map((action, idx) => {
        const isStreetStart = (action as any).type === 'STREET_START';

        if (isStreetStart) {
          const street = (action as any).street as string;
          return (
            <div key={`street-${idx}`} className="flex items-center gap-0.5 shrink-0">
              <div className="w-px h-3 bg-white/10 mx-0.5" />
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider">{STREET_ABBR[street] ?? street}</span>
              <div className="w-px h-3 bg-white/10 mx-0.5" />
            </div>
          );
        }

        const pa = action as PlayerAction;
        const isPast    = idx < currentStep;
        const isCurrent = idx === currentStep;
        const isHero    = pa.playerName === heroName;
        const color     = ACTION_COLOR[pa.type] ?? 'bg-slate-500';
        const label     = `${pa.playerName}: ${ACTION_LABEL[pa.type] ?? pa.type}${formatAmount(pa.amount)}`;

        return (
          <div
            key={idx}
            onMouseEnter={e => handleMouseEnter(e, label)}
            onClick={() => onSeek(idx)}
            className={`
              shrink-0 rounded-full cursor-pointer transition-all duration-100
              ${isHero ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'}
              ${color}
              ${isPast    ? 'opacity-60'                        : ''}
              ${isCurrent ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0a0f1a] opacity-100 scale-125' : ''}
              ${!isPast && !isCurrent ? 'opacity-25'           : ''}
              hover:opacity-100 hover:scale-125
            `}
          />
        );
      })}

      {/* End marker */}
      {currentStep >= actionsWithPauses.length && actionsWithPauses.length > 0 && (
        <div className="ml-1 w-1 h-4 rounded-full bg-white/40 shrink-0" />
      )}
    </div>
  );
};

export default Timeline;
