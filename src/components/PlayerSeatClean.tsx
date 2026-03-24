
import React from 'react';
import Card from './Card';
import { Player } from '../types';

// ─── Position colour palette ──────────────────────────────────────────────────
// Early = red  |  Middle = orange  |  Late = green  |  Blinds = blue
const POS: Record<string, { avatar: string; ring: string; label: string; dot: string; glow: string }> = {
  // ── Late (green) ──────────────────────────────────────────────────────────
  BTN:    { avatar: 'bg-emerald-500/20 border-emerald-500/45', ring: 'ring-emerald-400/70', label: 'text-emerald-300', dot: 'bg-emerald-400', glow: 'shadow-[0_0_18px_rgba(52,211,153,0.35)]' },
  CO:     { avatar: 'bg-emerald-500/20 border-emerald-500/45', ring: 'ring-emerald-400/70', label: 'text-emerald-300', dot: 'bg-emerald-400', glow: 'shadow-[0_0_18px_rgba(52,211,153,0.35)]' },
  // ── Middle (orange) ───────────────────────────────────────────────────────
  HJ:     { avatar: 'bg-orange-500/20 border-orange-500/45',   ring: 'ring-orange-400/70',  label: 'text-orange-300', dot: 'bg-orange-400', glow: 'shadow-[0_0_18px_rgba(251,146,60,0.35)]' },
  LJ:     { avatar: 'bg-orange-500/20 border-orange-500/45',   ring: 'ring-orange-400/70',  label: 'text-orange-300', dot: 'bg-orange-400', glow: 'shadow-[0_0_18px_rgba(251,146,60,0.35)]' },
  MP:     { avatar: 'bg-orange-500/20 border-orange-500/45',   ring: 'ring-orange-400/70',  label: 'text-orange-300', dot: 'bg-orange-400', glow: 'shadow-[0_0_18px_rgba(251,146,60,0.35)]' },
  'MP+1': { avatar: 'bg-orange-500/20 border-orange-500/45',   ring: 'ring-orange-400/70',  label: 'text-orange-300', dot: 'bg-orange-400', glow: 'shadow-[0_0_18px_rgba(251,146,60,0.35)]' },
  // ── Blinds (blue) ─────────────────────────────────────────────────────────
  SB:     { avatar: 'bg-blue-500/20 border-blue-500/45',       ring: 'ring-blue-400/70',    label: 'text-blue-300',   dot: 'bg-blue-400',   glow: 'shadow-[0_0_18px_rgba(96,165,250,0.35)]' },
  BB:     { avatar: 'bg-blue-500/20 border-blue-500/45',       ring: 'ring-blue-400/70',    label: 'text-blue-300',   dot: 'bg-blue-400',   glow: 'shadow-[0_0_18px_rgba(96,165,250,0.35)]' },
  // ── Early (red) ───────────────────────────────────────────────────────────
  UTG:    { avatar: 'bg-red-500/20 border-red-500/45',         ring: 'ring-red-400/70',     label: 'text-red-300',    dot: 'bg-red-400',    glow: 'shadow-[0_0_18px_rgba(248,113,113,0.35)]' },
  'UTG+1':{ avatar: 'bg-red-500/20 border-red-500/45',         ring: 'ring-red-400/70',     label: 'text-red-300',    dot: 'bg-red-400',    glow: 'shadow-[0_0_18px_rgba(248,113,113,0.35)]' },
  'UTG+2':{ avatar: 'bg-red-500/20 border-red-500/45',         ring: 'ring-red-400/70',     label: 'text-red-300',    dot: 'bg-red-400',    glow: 'shadow-[0_0_18px_rgba(248,113,113,0.35)]' },
};
const DEFAULT_POS = { avatar: 'bg-white/10 border-white/15', ring: 'ring-white/30', label: 'text-slate-400', dot: 'bg-slate-500', glow: '' };

// ─── Action colours ───────────────────────────────────────────────────────────
function actionColor(type?: string): string {
  if (!type) return 'bg-transparent';
  const t = type.toUpperCase();
  if (t === 'RAISE' || t === 'BET')   return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
  if (t === 'CALL')                   return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
  if (t === 'CHECK')                  return 'bg-white/5 text-slate-400 border-white/10';
  if (t === 'FOLD' || t === 'LOSER')  return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (t === 'WINNER' || t === 'COLLECTED') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (t === 'MUCKS' || t === 'MUCK') return 'bg-white/5 text-slate-600 border-white/5';
  return 'bg-white/5 text-slate-400 border-white/10';
}

function actionLabel(type?: string): string {
  if (!type) return '';
  const t = type.toUpperCase();
  if (t === 'COLLECTED') return 'WIN';
  if (t === 'MUCKS')     return 'MUCK';
  return t;
}

// ─── Bet position — pixel offsets push chip from player toward table center ───
// Players sit outside the oval; bets go inward ~60-80px so they appear on felt.
function betStyle(seat: number): React.CSSProperties {
  let x = 0, y = 0;
  switch (seat) {
    case 1: y =  80; break;                // top       → down
    case 2: y =  65; x = -110; break;     // upper-R   → down-left
    case 3: x = -130; break;              // right     → left
    case 4: y = -70; x = -115; break;     // lower-R   → up-left
    case 5: y = -90; x =  -95; break;     // bottom-R  → up-left
    case 6: y = -90; x =   95; break;     // bottom-L  → up-right
    case 7: y = -70; x =  115; break;     // lower-L   → up-right
    case 8: x =  130; break;              // left      → right
    case 9: y =  65; x =  110; break;     // upper-L   → down-right
  }
  return {
    position: 'absolute', top: '50%', left: '50%', zIndex: 100,
    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
  };
}

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

// ─── Props ────────────────────────────────────────────────────────────────────
interface PlayerSeatCleanProps {
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
}

// ─── Component ────────────────────────────────────────────────────────────────
const PlayerSeatClean: React.FC<PlayerSeatCleanProps> = ({
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
}) => {
  if (!player) {
    return (
      <div className="absolute opacity-0 pointer-events-none"
        style={{ top: position.top, left: position.left, transform: 'translate(-50%,-50%)' }} />
    );
  }

  const posStyle = POS[player.position] ?? DEFAULT_POS;
  const cardsToShow = revealedCards ?? (player.isHero ? player.cards : null);
  const isMucked = lastActionType?.toUpperCase() === 'MUCKS';
  const showCards = !hasFolded && !isMucked;
  const stackDisplay = displayMode === 'bb'
    ? `${(player.stack / bigBlindValue).toFixed(1)}bb`
    : Math.floor(player.stack).toLocaleString();
  const betDisplay = displayMode === 'bb'
    ? `${(currentBet / bigBlindValue).toFixed(1)}bb`
    : currentBet.toLocaleString();
  const displayName = hidePlayerNames
    ? (player.isHero ? 'HERO' : `P${player.seat}`)
    : player.name;

  // Acting = pulsing ring; winner = green glow; loser = red tint; folded = fade
  const wrapperOpacity = hasFolded ? 'opacity-25' : 'opacity-100';

  return (
    <div
      className={`absolute transition-all duration-500 z-50 select-none ${wrapperOpacity}`}
      style={{ top: position.top, left: position.left, transform: 'translate(-50%,-50%)' }}
    >
      {/* ── Cards (float above) — uniform sm size for all, hero gets subtle tilt ── */}
      <div className={`absolute left-1/2 -translate-x-1/2 bottom-[92%] flex justify-center gap-0.5 z-10 pointer-events-none transition-all duration-500 ${!showCards ? 'opacity-0 scale-75' : 'opacity-100'}`}>
        {showCards && (<>
          <div className={player.isHero ? 'rotate-[-4deg] drop-shadow-xl' : ''}>
            <Card code={cardsToShow?.[0] || 'back'} size="sm" hidden={!cardsToShow} />
          </div>
          <div className={player.isHero ? 'rotate-[4deg] drop-shadow-xl' : ''}>
            <Card code={cardsToShow?.[1] || 'back'} size="sm" hidden={!cardsToShow} />
          </div>
        </>)}
      </div>

      {/* ── Main seat ───────────────────────────────────────────────────── */}
      <div className="relative flex flex-col items-center gap-1" style={{ minWidth: 104 }}>
        {/* Dealer button */}
        {isDealer && (
          <div className={`absolute ${dealerPos(player.seat)} w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(255,255,255,0.8)] z-[300] ring-2 ring-black/60`}>
            <span className="text-[8px] font-black text-slate-900">D</span>
          </div>
        )}

        {/* Avatar circle — uniform size; hero gets persistent ring */}
        <div className={`relative flex items-center justify-center rounded-full border-2 w-12 h-12 transition-all duration-300 ${posStyle.avatar} ${
          isActing
            ? `ring-2 ${posStyle.ring} ${posStyle.glow} scale-110`
            : isWinner
            ? 'ring-2 ring-emerald-400/80 shadow-[0_0_24px_rgba(52,211,153,0.45)]'
            : isLoser
            ? 'ring-1 ring-red-500/40 opacity-70'
            : player.isHero
            ? `ring-2 ring-white/35 shadow-[0_0_14px_rgba(255,255,255,0.15)]`
            : posStyle.glow
        }`}>
          {/* Position label */}
          <span className={`font-black uppercase leading-none text-[11px] ${player.isHero ? 'text-white' : posStyle.label}`}>
            {player.position}
          </span>

          {/* Acting pulse ring */}
          {isActing && (
            <span className="absolute inset-0 rounded-full animate-ping opacity-30 ring-2 ring-white" />
          )}

          {/* Player note indicator */}
          {!player.isHero && onPlayerNote && (
            <button
              onClick={e => { e.stopPropagation(); onPlayerNote(player.name); }}
              title={playerNote ? 'Ver nota' : 'Adicionar nota'}
              className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center transition-all z-10 ${playerNote ? 'bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.5)]' : 'bg-white/10 hover:bg-purple-500/40'}`}
            >
              <span className="text-[7px] font-black text-white leading-none">
                {playerNoteLabel ? playerNoteLabel[0] : '+'}
              </span>
            </button>
          )}
        </div>

        {/* Name + stack */}
        <div
          className="flex flex-col items-center gap-0.5 cursor-pointer mt-0.5"
          onClick={onToggleDisplay}
          title="Alternar Fichas/BB"
        >
          {/* Name */}
          <span className={`text-[10px] font-semibold truncate max-w-[108px] leading-none ${player.isHero ? 'text-white' : 'text-slate-300'}`}>
            {displayName}
          </span>

          {/* Stack */}
          <span className={`font-mono-poker font-bold leading-none text-[11px] ${player.isHero ? 'text-white' : 'text-slate-400'}`}>
            {stackDisplay}
          </span>
        </div>

        {/* Action badge */}
        {(() => {
          const label = isActing ? 'ATUANDO' : isWinner ? 'WIN' : isLoser ? 'LOSS' : actionLabel(lastActionType);
          if (!label) return null;
          const style = isActing
            ? 'bg-white/10 text-white border-white/25'
            : isWinner
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : actionColor(isLoser ? 'LOSER' : lastActionType);
          return (
            <span className={`mt-0.5 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase border tracking-widest ${style} flex items-center gap-1`}>
              {isActing && <span className="w-1 h-1 rounded-full bg-white animate-ping inline-block" />}
              {label}
            </span>
          );
        })()}
      </div>

      {/* ── Bet chip ────────────────────────────────────────────────────── */}
      {currentBet > 0 && !hasFolded && (
        <div style={betStyle(player.seat)} className="pointer-events-none">
          <div className="flex items-center gap-1.5 bg-black/75 border border-white/12 backdrop-blur-md px-2.5 py-1 rounded-full shadow-2xl">
            <div className={`w-2 h-2 rounded-full ${posStyle.dot} shadow-sm`} />
            <span className="text-[11px] font-mono-poker font-black text-white tracking-tight leading-none">
              {betDisplay}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerSeatClean;
