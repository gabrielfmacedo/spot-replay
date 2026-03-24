
import React from 'react';
import Card from './Card';
import { Player } from '../types';

interface PlayerSeatProps {
  player?: Player;
  isActing?: boolean;
  hasFolded?: boolean;
  currentBet?: number;
  position: { top: string, left: string };
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

const PlayerSeat: React.FC<PlayerSeatProps> = ({
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
  const getBetStyle = (): React.CSSProperties => {
    let x = 0, y = 0;
    switch (player?.seat) {
      case 1: y =  90; break;
      case 2: y =  75; x = -120; break;
      case 3: x = -150; break;
      case 4: y = -100; x = -135; break;
      case 5: y = -120; x = -55; break;
      case 6: y = -120; x =  55; break;
      case 7: y = -100; x =  135; break;
      case 8: x =  150; break;
      case 9: y =  75;  x =  120; break;
    }
    return {
      position: 'absolute', top: '50%', left: '50%',
      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
      zIndex: 100,
    };
  };

  const getCardPositioning = (_isHero: boolean) => {
    return "bottom-[calc(100%+4px)]";
  };

  const getDealerButtonStyle = (seat: number): string => {
    switch (seat) {
      case 1: return "bottom-[-10px] right-[-10px]";
      case 2: return "bottom-[-10px] left-[-10px]";
      case 3: return "bottom-[-10px] left-[-10px]";
      case 4: return "top-[-10px] left-[-10px]";
      case 5: return "top-[-10px] right-[-10px]";
      case 6: return "top-[-10px] right-[-10px]";
      case 7: return "top-[-10px] right-[-10px]";
      case 8: return "bottom-[-10px] left-[-10px]";
      case 9: return "bottom-[-10px] right-[-10px]";
      default: return "top-[-10px] right-[-10px]";
    }
  };

  const getActionColor = (type?: string) => {
    if (!type) return '';
    const t = type.toUpperCase();
    if (t === 'RAISE') return 'text-orange-400';
    if (t === 'BET') return 'text-yellow-400';
    if (t === 'CALL') return 'text-blue-300';
    if (t === 'FOLD' || t === 'LOSER') return 'text-red-400';
    if (t === 'CHECK') return 'text-slate-300';
    if (t === 'WINNER' || t === 'COLLECTED') return 'text-emerald-400 font-bold';
    if (t === 'MUCKS' || t === 'MUCK') return 'text-slate-500 italic';
    return 'text-blue-400';
  };

  if (!player) {
    return (
      <div 
        className="absolute transition-all duration-700 opacity-5 pointer-events-none"
        style={{ top: position.top, left: position.left, transform: 'translate(-50%, -50%)' }}
      >
        <div className="w-32 h-16 border-2 border-dashed border-white/5 rounded-2xl"></div>
      </div>
    );
  }

  const cardsToDisplay = revealedCards || (player.isHero ? player.cards : null);
  const isMucked = lastActionType?.toUpperCase() === 'MUCKS';

  return (
    <div 
      className={`absolute transition-all duration-700 z-50`}
      style={{ 
        top: position.top, 
        left: position.left,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {isDealer && (
        <div 
          className={`absolute ${getDealerButtonStyle(player.seat)} w-6 h-6 bg-white rounded-full border-2 border-slate-300 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,1)] z-[300] transform transition-all duration-300 hover:scale-125 hover:shadow-[0_0_30px_rgba(255,255,255,1)] ring-2 ring-black/40`}
        >
           <span className="text-[9px] font-black text-slate-900 select-none">D</span>
        </div>
      )}

      {/* Cards tucked behind seat — seat card (z-20) covers the overlap portion */}
      <div
        className={`absolute flex -space-x-3 pointer-events-none transition-all duration-500 ${hasFolded || isMucked ? 'opacity-0 scale-75' : 'opacity-100'}`}
        style={{ bottom: 'calc(100% - 24px)', left: '50%', transform: 'translateX(-50%)' }}
      >
        {!hasFolded && !isMucked && (<>
          <div className="rotate-[-6deg] drop-shadow-xl">
            <Card code={cardsToDisplay?.[0] || 'back'} size="lg" hidden={!cardsToDisplay} cardStyle={cardStyle} />
          </div>
          <div className="rotate-[6deg] drop-shadow-xl">
            <Card code={cardsToDisplay?.[1] || 'back'} size="lg" hidden={!cardsToDisplay} cardStyle={cardStyle} />
          </div>
        </>)}
      </div>

      <div className={`w-36 overflow-visible rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.5)] transition-all duration-300 ${
        isActing ? `scale-105 border-blue-500 bg-slate-900${actingGlow ? ' animate-acting-glow-blue' : ' ring-4 ring-blue-500/30'}` :
        isWinner ? 'scale-110 border-emerald-400 bg-emerald-950 ring-4 ring-emerald-400/30 animate-winner-glow' :
        isLoser ? 'scale-100 border-red-500/40 bg-black/95 animate-loser-pulse' :
        'border-white/10 bg-black/95'
      } ${hasFolded ? 'opacity-30 grayscale' : 'opacity-100'} border-2 backdrop-blur-3xl relative z-20`}>

        <div className={`px-2 py-1 flex justify-between items-center text-[9px] font-black uppercase tracking-widest rounded-t-[10px] ${
            isActing ? 'bg-blue-600 text-white' :
            isWinner ? 'bg-emerald-500 text-white' :
            isLoser  ? 'bg-red-900/60 text-red-400 border-b border-red-500/20' :
            'bg-white/5 text-slate-400 border-b border-white/5'
        }`}>
          <span className="flex items-center gap-1 font-black">
            {player.position} #{player.seat}
          </span>
          <span className={`font-black ${isActing ? 'text-white' : getActionColor(isWinner ? 'WINNER' : isLoser ? 'LOSER' : lastActionType)} transition-colors duration-300`}>
            {isActing ? (
              <span className="flex items-center gap-1">
                ACTING {actingGlow && <span className="relative flex w-1.5 h-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-white"></span></span>}
              </span>
            ) : isWinner ? 'WINNER' : isLoser ? 'LOSER' : (lastActionType === 'COLLECTED' ? 'WINNER' : lastActionType === 'MUCKS' ? 'MUCK' : lastActionType) || ''}
          </span>
        </div>
        <div
          className="p-2 text-center cursor-pointer select-none active:scale-95 transition-transform"
          onClick={onToggleDisplay}
          title="Clique para alternar Fichas/BB"
        >
            <div className="flex items-center justify-center gap-1 mb-1">
              <div className="text-[11px] font-black text-white truncate uppercase tracking-tighter">{hidePlayerNames ? (player.isHero ? 'HERO' : `P${player.seat}`) : player.name}</div>
              {!player.isHero && onPlayerNote && (
                <button
                  onClick={e => { e.stopPropagation(); onPlayerNote(player.name); }}
                  title={playerNote ? 'Ver nota do jogador' : 'Adicionar nota'}
                  className={`shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${playerNote ? 'bg-purple-500 text-white' : 'bg-white/10 text-slate-500 hover:bg-purple-500/40 hover:text-purple-300'}`}
                >
                  <span className="text-[7px] font-black leading-none">{playerNoteLabel ? playerNoteLabel[0] : '+'}</span>
                </button>
              )}
            </div>
            <div className="text-[12px] font-mono-poker font-bold text-emerald-400 bg-emerald-500/10 py-0.5 rounded border border-emerald-400/20">
               {displayMode === 'bb'
                 ? `${(player.stack / bigBlindValue).toFixed(1)}bb`
                 : Math.floor(player.stack).toLocaleString()}
            </div>
            {isKnockout && player.bounty && (
              <div className="text-[10px] font-black text-amber-400 mt-0.5">
                💀 {player.bounty}
              </div>
            )}
        </div>
      </div>

      {currentBet > 0 && !hasFolded && (
        <div style={getBetStyle()} className="transition-all duration-500 pointer-events-none">
           <div className="bg-black/95 border border-white/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xl border-b-2 border-b-blue-600 ring-2 ring-black">
             <div className="w-3 h-3 rounded-full bg-red-600 border border-white/40 flex items-center justify-center shadow-inner">
                <div className="w-0.5 h-0.5 bg-white/80 rounded-full"></div>
             </div>
             <span className="text-[13px] md:text-[14px] font-mono-poker font-black text-white leading-none tracking-tighter">
               {displayMode === 'bb'
                 ? `${(currentBet / bigBlindValue).toFixed(1)}bb`
                 : currentBet.toLocaleString()}
             </span>
           </div>
        </div>
      )}
    </div>
  );
};

export default PlayerSeat;
