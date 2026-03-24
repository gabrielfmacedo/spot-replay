
import React from 'react';
import Card from './Card';
import { Player } from '../types';

// ─── Position colours (text only — minimal palette) ──────────────────────────
const POS_COLOR: Record<string, string> = {
  BTN: 'text-emerald-400', CO: 'text-emerald-400',
  HJ:  'text-orange-400',  LJ:  'text-orange-400',
  MP:  'text-orange-400',  'MP+1': 'text-orange-400',
  SB:  'text-blue-400',    BB:  'text-blue-400',
  UTG: 'text-red-400',     'UTG+1': 'text-red-400', 'UTG+2': 'text-red-400',
};
const POS_DOT: Record<string, string> = {
  BTN: 'bg-emerald-400', CO: 'bg-emerald-400',
  HJ:  'bg-orange-400',  LJ:  'bg-orange-400',
  MP:  'bg-orange-400',  'MP+1': 'bg-orange-400',
  SB:  'bg-blue-400',    BB:  'bg-blue-400',
  UTG: 'bg-red-400',     'UTG+1': 'bg-red-400', 'UTG+2': 'bg-red-400',
};

// ─── Bet chip positions — pixel offsets toward table center ───────────────────
function betStyle(seat: number): React.CSSProperties {
  let x = 0, y = 0;
  switch (seat) {
    case 1: y =  52; x = -55; break;
    case 2: y =  65; x = -110; break;
    case 3: x = -130; break;
    case 4: y = -70; x = -115; break;
    case 5: y = -90; x =  -95; break;
    case 6: y = -90; x =   95; break;
    case 7: y = -70; x =  115; break;
    case 8: x =  130; break;
    case 9: y =  65; x =  110; break;
  }
  return {
    position: 'absolute', top: '50%', left: '50%', zIndex: 100,
    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
  };
}

// ─── Dealer button position ───────────────────────────────────────────────────
function dealerPos(seat: number): string {
  switch (seat) {
    case 1: return 'bottom-[-8px] right-[-8px]';
    case 2: return 'bottom-[-8px] left-[-8px]';
    case 3: return 'bottom-[-8px] left-[-8px]';
    case 4: return 'top-[-8px] left-[-8px]';
    case 5: return 'top-[-8px] right-[-8px]';
    case 6: return 'top-[-8px] right-[-8px]';
    case 7: return 'top-[-8px] right-[-8px]';
    case 8: return 'bottom-[-8px] left-[-8px]';
    case 9: return 'bottom-[-8px] right-[-8px]';
    default: return 'top-[-8px] right-[-8px]';
  }
}

// ─── Action label ─────────────────────────────────────────────────────────────
function actionLabel(type?: string): string {
  if (!type) return '';
  const t = type.toUpperCase();
  if (t === 'COLLECTED') return 'WIN';
  if (t === 'MUCKS') return 'MUCK';
  return t;
}

function actionColor(type?: string) {
  if (!type) return 'text-slate-600';
  const t = type.toUpperCase();
  if (t === 'RAISE' || t === 'BET')         return 'text-orange-400';
  if (t === 'CALL')                          return 'text-sky-400';
  if (t === 'CHECK')                         return 'text-slate-500';
  if (t === 'FOLD' || t === 'LOSER')         return 'text-red-500';
  if (t === 'WINNER' || t === 'COLLECTED')   return 'text-emerald-400';
  if (t === 'MUCKS' || t === 'MUCK')         return 'text-slate-600';
  return 'text-slate-500';
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface PlayerSeatMinimalProps {
  player?: Player;
  isActing?: boolean;
  hasFolded?: boolean;
  currentBet?: number;
  position: { top: string; left: string };
  isDealer?: boolean;
  lastActionType?: string;
  revealedCards?: string[];
  isWinner?: boolean;
  isLoser?: boolean;
  displayMode?: 'chips' | 'bb';
  bigBlindValue?: number;
  onToggleDisplay?: () => void;
  hidePlayerNames?: boolean;
  playerNote?: string;
  playerNoteLabel?: string;
  onPlayerNote?: (playerName: string) => void;
  cardStyle?: 'off' | 'text' | 'bg';
  isKnockout?: boolean;
  actingGlow?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
const PlayerSeatMinimal: React.FC<PlayerSeatMinimalProps> = ({
  player,
  isActing = false,
  hasFolded = false,
  currentBet = 0,
  position,
  isDealer = false,
  lastActionType,
  revealedCards,
  isWinner = false,
  isLoser = false,
  displayMode = 'chips',
  bigBlindValue = 1,
  onToggleDisplay,
  hidePlayerNames = false,
  playerNote = '',
  playerNoteLabel = '',
  onPlayerNote,
  cardStyle = 'off',
  isKnockout = false,
  actingGlow = true,
}) => {
  if (!player) {
    return (
      <div className="absolute opacity-0 pointer-events-none"
        style={{ top: position.top, left: position.left, transform: 'translate(-50%,-50%)' }} />
    );
  }

  const posColor   = POS_COLOR[player.position] ?? 'text-slate-400';
  const posDot     = POS_DOT[player.position]   ?? 'bg-slate-500';
  const isMucked   = lastActionType?.toUpperCase() === 'MUCKS';
  const showCards  = !hasFolded && !isMucked;
  const cardsToShow = revealedCards ?? (player.isHero ? player.cards : null);

  const stackDisplay = displayMode === 'bb'
    ? `${(player.stack / bigBlindValue).toFixed(1)}bb`
    : Math.floor(player.stack).toLocaleString();
  const betDisplay = displayMode === 'bb'
    ? `${(currentBet / bigBlindValue).toFixed(1)}bb`
    : currentBet.toLocaleString();
  const displayName = hidePlayerNames
    ? (player.isHero ? 'HERO' : `P${player.seat}`)
    : player.name;

  const wrapperOpacity = hasFolded ? 'opacity-30' : 'opacity-100';

  // Pill border state
  const pillBorder = isActing
    ? `border-white/40${actingGlow ? ' animate-acting-glow' : ' shadow-[0_0_12px_rgba(255,255,255,0.25)]'}`
    : isWinner
    ? 'border-emerald-400/70 shadow-[0_0_10px_rgba(52,211,153,0.25)] animate-winner-glow'
    : isLoser
    ? 'border-red-500/50 animate-loser-pulse'
    : player.isHero
    ? 'border-white/20 shadow-[0_0_8px_rgba(255,255,255,0.08)]'
    : 'border-white/10';

  const badgeLabel = isActing ? 'ACT' : isWinner ? 'WIN' : isLoser ? 'LOSS' : actionLabel(lastActionType);
  const badgeColor = isActing
    ? 'text-white'
    : isWinner ? 'text-emerald-400'
    : actionColor(isLoser ? 'LOSER' : lastActionType);

  return (
    <div
      className={`absolute z-50 select-none transition-all duration-500 ${wrapperOpacity}`}
      style={{ top: position.top, left: position.left, transform: 'translate(-50%,-50%)' }}
    >
      {/* ── Cards behind pill — pill (painted after) covers the overlap ────── */}
      <div
        className={`absolute flex gap-1 pointer-events-none transition-all duration-500 ${!showCards ? 'opacity-0 scale-75' : 'opacity-100'}`}
        style={{ bottom: 'calc(100% - 18px)', left: '50%', transform: 'translateX(-50%)' }}
      >
        {showCards && (<>
          <Card code={cardsToShow?.[0] || 'back'} size="lg" hidden={!cardsToShow} cardStyle={cardStyle} />
          <Card code={cardsToShow?.[1] || 'back'} size="lg" hidden={!cardsToShow} cardStyle={cardStyle} />
        </>)}
      </div>

      {/* ── Seat pill ────────────────────────────────────────────────────── */}
      <div className={`relative border rounded-xl bg-black/60 backdrop-blur-sm transition-all duration-300 ${pillBorder} ${isActing ? 'scale-105' : ''}`}>
        {/* Dealer */}
        {isDealer && (
          <div className={`absolute ${dealerPos(player.seat)} w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-lg z-[300] ring-1 ring-black/60`}>
            <span className="text-[7px] font-black text-slate-900">D</span>
          </div>
        )}

        <div className="flex items-center gap-2.5 px-3 py-2" style={{ minWidth: 110 }}>
          {/* Position dot + label */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative w-2 h-2 shrink-0">
              {isActing && actingGlow && <span className="animate-ping absolute inset-0 rounded-full bg-white opacity-60" />}
              <span className={`absolute inset-0 rounded-full ${posDot}`} />
            </div>
            <span className={`text-[12px] font-black uppercase leading-none ${posColor}`}>
              {player.position}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-white/10 shrink-0" />

          {/* Name + stack — name opens note, stack toggles chips/bb */}
          <div className="flex flex-col min-w-0">
            <span
              className={`text-[10px] font-semibold truncate leading-none flex items-center gap-1 ${player.isHero ? 'text-white' : 'text-slate-400'} ${!player.isHero && onPlayerNote ? 'cursor-pointer hover:text-white transition-colors' : ''}`}
              style={{ maxWidth: 88 }}
              onClick={e => { e.stopPropagation(); if (!player.isHero && onPlayerNote) onPlayerNote(player.name); }}
            >
              {displayName}
              {!player.isHero && playerNote && (
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 inline-block" />
              )}
            </span>
            <span
              className={`text-[12px] font-mono-poker font-black leading-none mt-0.5 cursor-pointer ${player.isHero ? 'text-white' : 'text-slate-300'}`}
              onClick={e => { e.stopPropagation(); onToggleDisplay?.(); }}
            >
              {stackDisplay}
            </span>
            {isKnockout && player.bounty && (
              <span className="text-[9px] font-black leading-none mt-0.5 text-amber-400">
                💀 {player.bounty}
              </span>
            )}
          </div>

          {/* Action badge — always reserve space to prevent layout shift */}
          <span
            className={`text-[10px] font-black uppercase shrink-0 transition-opacity duration-200 ${badgeLabel ? `opacity-100 ${badgeColor}` : 'opacity-0'}`}
            style={{ minWidth: 34 }}
          >
            {badgeLabel}
          </span>
        </div>
      </div>

      {/* ── Bet amount ───────────────────────────────────────────────────── */}
      {currentBet > 0 && !hasFolded && (
        <div style={betStyle(player.seat)} className="pointer-events-none">
          <div className="flex items-center gap-1 bg-black/70 border border-white/15 px-2.5 py-1 rounded-full">
            <div className={`w-1.5 h-1.5 rounded-full ${posDot}`} />
            <span className="text-[13px] font-mono-poker font-black text-white leading-none">
              {betDisplay}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerSeatMinimal;
