import { useMemo } from 'react';
import { HandHistory, PlayerAction, ActionWithPause, StreetStartAction, GameState } from '../types';

/**
 * Computes the game state at `currentStep` by replaying all actions
 * from the beginning of the hand.
 */
export function useGameState(
  currentHand: HandHistory | undefined,
  currentStep: number,
  actionsWithPauses: ActionWithPause[],
  hideResults: boolean
): GameState {
  return useMemo((): GameState => {
    type MutablePS = GameState['playerStates'][string] & { isLoser?: boolean };
    const playerStates: Record<string, MutablePS> = {};
    const state: GameState & { currentPot: number } = {
      currentStep, currentPot: 0, street: 'PREFLOP', visibleBoard: [], playerStates,
    };
    if (!currentHand) return state;
    state.currentPot = currentHand.totalPot;

    // Initialise player states
    currentHand.players.forEach(p => {
      playerStates[p.name] = {
        stack: p.initialStack, currentBet: 0, hasFolded: false,
        isActing: false, lastActionType: '', revealedCards: undefined,
        isWinner: false, isLoser: false,
      };
    });

    // Apply blinds to stacks/pot
    currentHand.actions
      .filter(a => a.type === 'POST_SB' || a.type === 'POST_BB')
      .forEach(a => {
        const ps = playerStates[a.playerName]; if (!ps) return;
        ps.stack -= (a.amount ?? 0);
        ps.currentBet = a.amount ?? 0;
        state.currentPot += (a.amount ?? 0);
      });

    let maxBet = 0;
    Object.values(playerStates).forEach(ps => { if (ps.currentBet > maxBet) maxBet = ps.currentBet; });

    // Precompute lookup maps — O(1) per-player access instead of O(n) .find()
    const winners  = new Set(currentHand.actions.filter(a => a.type === 'COLLECTED').map(a => a.playerName));
    const showActs = currentHand.actions.filter(a => a.type === 'SHOWS');
    const muckActs = currentHand.actions.filter(a => a.type === 'MUCKS');
    const heroName = currentHand.players.find(p => p.isHero)?.name ?? '';
    const showMap  = new Map(showActs.map(a => [a.playerName, a]));
    const muckMap  = new Map(muckActs.map(a => [a.playerName, a]));

    // Replay actions up to currentStep
    for (let i = 0; i < currentStep; i++) {
      const action = actionsWithPauses[i];

      // ── Street transition ────────────────────────────────────────────────
      if (action.type === 'STREET_START') {
        const { street: newStreet } = action as StreetStartAction;
        state.street = newStreet as GameState['street'];
        maxBet = 0;
        Object.values(playerStates).forEach(ps => { ps.currentBet = 0; ps.lastActionType = ''; });

        if (newStreet === 'ALLIN_REVEAL') {
          const revealFilter = hideResults
            ? showActs.filter(a => a.playerName === heroName)
            : showActs;
          revealFilter.forEach(a => { const ps = playerStates[a.playerName]; if (ps) ps.revealedCards = a.cards; });
          continue;
        }

        if (newStreet === 'SHOWDOWN') {
          if (!hideResults) {
            showActs.forEach(a => { const ps = playerStates[a.playerName]; if (ps) ps.revealedCards = a.cards; });
            muckActs.forEach(a => { const ps = playerStates[a.playerName]; if (ps) { ps.lastActionType = 'MUCKS'; ps.revealedCards = undefined; } });
            currentHand.players.forEach(p => {
              const ps = playerStates[p.name]; if (!ps) return;
              if (winners.has(p.name)) ps.isWinner = true;
              else if (!ps.hasFolded) ps.isLoser = true;
            });
          } else {
            showActs.filter(a => a.playerName === heroName).forEach(a => { const ps = playerStates[a.playerName]; if (ps) ps.revealedCards = a.cards; });
          }
        }
        continue;
      }

      // ── Player action ────────────────────────────────────────────────────
      const pa = action as PlayerAction;
      const ps = playerStates[pa.playerName]; if (!ps) continue;
      ps.lastActionType = pa.type;

      if (pa.type === 'FOLD') {
        ps.hasFolded = true; ps.currentBet = 0;
      } else if (pa.type === 'SHOWS') {
        if (!hideResults || pa.playerName === heroName) ps.revealedCards = pa.cards;
      } else if (pa.type === 'MUCKS') {
        ps.lastActionType = 'MUCKS'; ps.revealedCards = undefined;
      } else if (pa.type === 'CHECK' || pa.type === 'COLLECTED') {
        /* no stack change */
      } else if (pa.type === 'UNCALLED_RETURN') {
        const amt = pa.amount ?? 0;
        ps.stack += amt;
        state.currentPot = Math.max(0, state.currentPot - amt);
        ps.currentBet = Math.max(0, ps.currentBet - amt);
      } else {
        // CALL / BET / RAISE / POST_SB / POST_BB
        let total = pa.amount ?? 0;
        if (pa.type === 'CALL') total = maxBet;
        if (pa.type === 'RAISE' || pa.type === 'BET') { if (total > maxBet) maxBet = total; }
        // Cap at what the player can pay (handles short-stack all-in calls)
        const maxCanPay = ps.currentBet + ps.stack;
        const effectiveTotal = Math.min(total, maxCanPay);
        const diff = effectiveTotal - ps.currentBet;
        ps.stack = Math.max(0, ps.stack - diff);
        state.currentPot += diff;
        ps.currentBet = effectiveTotal;
      }
    }

    // Final step: ensure results shown
    if (currentStep === actionsWithPauses.length) {
      currentHand.players.forEach(p => {
        const ps = playerStates[p.name]; if (!ps) return;
        if (!hideResults) {
          if (winners.has(p.name)) ps.isWinner = true;
          else if (!ps.hasFolded) ps.isLoser = true;
        }
        const sa = showMap.get(p.name);
        if (sa && (!hideResults || p.name === heroName)) ps.revealedCards = sa.cards;
        const ma = muckMap.get(p.name);
        if (ma) { ps.lastActionType = 'MUCKS'; ps.revealedCards = undefined; }
      });
    }

    // Set visible board cards based on street
    const sIdx = ['PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'].indexOf(state.street);
    if (sIdx >= 1) state.visibleBoard = currentHand.board.slice(0, 3);
    if (sIdx >= 2) state.visibleBoard = currentHand.board.slice(0, 4);
    if (sIdx >= 3) state.visibleBoard = currentHand.board.slice(0, 5);

    // Mark next-to-act player
    if (currentStep < actionsWithPauses.length && state.street !== 'SHOWDOWN') {
      const next = actionsWithPauses[currentStep];
      if (next && next.type !== 'STREET_START') {
        const ns = playerStates[(next as PlayerAction).playerName];
        if (ns) ns.isActing = true;
      }
    }

    return state;
  }, [currentHand, currentStep, actionsWithPauses, hideResults]);
}
