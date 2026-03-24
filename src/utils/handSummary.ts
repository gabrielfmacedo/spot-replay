
import { HandHistory, PlayerAction } from '../types';

const SUIT_SYMBOLS: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };

function formatCard(code: string): string {
  if (!code || code.length < 2) return code;
  const rank = code[0];
  const suit = SUIT_SYMBOLS[code[1]] ?? code[1];
  return `${rank}${suit}`;
}

function formatAmount(amount: number, bigBlindValue: number, displayMode: 'chips' | 'bb'): string {
  if (displayMode === 'bb') return `${(amount / bigBlindValue).toFixed(1)}bb`;
  return String(Math.round(amount));
}

export interface StreetSummary {
  street: string;
  board: string[];        // board cards for this street (flop=3, turn=4, river=5)
  texture: string | null; // board texture label (provided externally)
  lines: ActionLine[];
}

export interface ActionLine {
  playerName: string;
  isHero: boolean;
  type: string;
  amount?: number;
}

export interface HandSummaryData {
  heroName: string;
  heroPos: string;
  heroCards: string[];
  streets: StreetSummary[];
  result: 'win' | 'lose' | 'none';
}

export function buildHandSummary(
  hand: HandHistory,
  bigBlindValue: number,
  displayMode: 'chips' | 'bb'
): HandSummaryData {
  const hero = hand.players.find(p => p.isHero);
  const heroName = hero?.name ?? '';

  const STREET_ORDER = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'] as const;

  const streets: StreetSummary[] = [];

  for (const street of STREET_ORDER) {
    const actions = hand.actions.filter(
      a =>
        a.street === street &&
        a.type !== 'POST_SB' &&
        a.type !== 'POST_BB' &&
        a.type !== 'SHOWS' &&
        a.type !== 'MUCKS' &&
        a.type !== 'UNCALLED_RETURN' &&
        a.type !== 'COLLECTED'
    );

    if (actions.length === 0) continue;

    const board =
      street === 'FLOP' ? hand.board.slice(0, 3) :
      street === 'TURN' ? hand.board.slice(0, 4) :
      street === 'RIVER' ? hand.board.slice(0, 5) :
      [];

    const lines: ActionLine[] = actions.map(a => ({
      playerName: a.playerName,
      isHero: a.playerName === heroName,
      type: a.type,
      amount: a.amount,
    }));

    streets.push({ street, board, texture: null, lines });
  }

  return {
    heroName,
    heroPos: hand.summary.heroPos,
    heroCards: hand.summary.heroCards,
    streets,
    result: hand.summary.heroStatus,
  };
}

/** Generate a compact one-line text summary for a hand */
export function generateOneLiner(hand: HandHistory): string {
  const hero = hand.players.find(p => p.isHero);
  if (!hero) return '';

  const parts: string[] = [];

  const streetLabels: Record<string, string> = {
    PREFLOP: 'PRE',
    FLOP: 'FLP',
    TURN: 'TRN',
    RIVER: 'RVR',
  };

  const streets = ['PREFLOP', 'FLOP', 'TURN', 'RIVER'] as const;

  for (const street of streets) {
    const actions = hand.actions.filter(
      a => a.street === street && a.type !== 'POST_SB' && a.type !== 'POST_BB' &&
           a.type !== 'SHOWS' && a.type !== 'MUCKS' && a.type !== 'UNCALLED_RETURN'
    );
    if (actions.length === 0) continue;

    const prefix = street !== 'PREFLOP'
      ? `${streetLabels[street]}[${hand.board.slice(0, street === 'FLOP' ? 3 : street === 'TURN' ? 4 : 5).join(' ')}]:`
      : 'PRE:';

    const actionStr = actions
      .map(a => {
        const isHero = a.playerName === hero.name;
        const name = isHero ? 'Hero' : a.playerName.length > 8 ? a.playerName.slice(0, 7) + '…' : a.playerName;
        switch (a.type) {
          case 'FOLD':    return `${name} fold`;
          case 'CHECK':   return `${name} check`;
          case 'CALL':    return `${name} call`;
          case 'BET':     return `${name} bet ${Math.round(a.amount ?? 0)}`;
          case 'RAISE':   return `${name} raise ${Math.round(a.amount ?? 0)}`;
          case 'COLLECTED': return `${name} wins`;
          default: return '';
        }
      })
      .filter(Boolean)
      .join(' · ');

    parts.push(`${prefix} ${actionStr}`);
  }

  return parts.join('  |  ');
}

/** Compute the effective SPR (Stack-to-Pot Ratio) at the start of the flop */
export function computeSPR(hand: HandHistory): number | null {
  const hero = hand.players.find(p => p.isHero);
  if (!hero || hand.board.length < 3) return null;

  const potAfterPreflop = hand.actions
    .filter(a => a.street === 'PREFLOP' && (a.type === 'CALL' || a.type === 'RAISE' || a.type === 'BET' || a.type === 'POST_SB' || a.type === 'POST_BB'))
    .reduce((sum, a) => sum + (a.amount ?? 0), 0);

  if (potAfterPreflop === 0) return null;

  // Rough hero stack estimate at flop start (initialStack - preflop investment)
  const preflopInvested = hand.actions
    .filter(a => a.playerName === hero.name && a.street === 'PREFLOP' && (a.type === 'CALL' || a.type === 'RAISE' || a.type === 'BET' || a.type === 'POST_SB' || a.type === 'POST_BB'))
    .reduce((sum, a) => sum + (a.amount ?? 0), 0);

  const heroStack = hero.initialStack - preflopInvested;
  return Math.round((heroStack / potAfterPreflop) * 10) / 10;
}
