
import { HandHistory, Player, PlayerAction, ActionType } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assignPositions(players: Player[], buttonSeat: number) {
  players.sort((a, b) => a.seat - b.seat);
  const btnIdx = players.findIndex(p => p.seat === buttonSeat);
  const n = players.length;
  players.forEach((p, i) => {
    const rel = (i - btnIdx + n) % n;
    if (n === 2) { p.position = rel === 0 ? 'BTN/SB' : 'BB'; return; }
    if (rel === 0) p.position = 'BTN';
    else if (rel === 1) p.position = 'SB';
    else if (rel === 2) p.position = 'BB';
    else {
      const dist = n - rel;
      if (dist === 1) p.position = 'CO';
      else if (dist === 2) p.position = 'HJ';
      else if (dist === 3) p.position = 'LJ';
      else if (dist === 4) p.position = 'MP';
      else p.position = 'UTG';
    }
  });
}

function buildSummary(players: Player[], actions: PlayerAction[]) {
  const winners = new Set(actions.filter(a => a.type === 'COLLECTED').map(a => a.playerName));
  const hero = players.find(p => p.isHero);
  const heroStatus = hero
    ? (winners.has(hero.name) ? 'win'
      : actions.some(a => a.playerName === hero.name && a.type === 'FOLD') ? 'none'
      : 'lose')
    : 'none';
  return {
    heroStatus: heroStatus as 'win' | 'lose' | 'none',
    heroCards: hero?.cards || [],
    heroPos: hero?.position || '',
  };
}

// Parse card codes — normalise uppercase ranks and lowercase suits
// "Ah" → "Ah", "AH" → "Ah", "10h" → "Th"
function normaliseCard(raw: string): string {
  const r = raw.trim();
  if (!r) return r;
  const rank = r.slice(0, r.length - 1).toUpperCase().replace('10', 'T');
  const suit = r.slice(-1).toLowerCase();
  return rank + suit;
}

function parseCards(str: string): string[] {
  return str.split(/[\s,]+/).map(normaliseCard).filter(c => c.length >= 2 && c.length <= 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// POKERSTARS
// ─────────────────────────────────────────────────────────────────────────────
function parsePokerStarsHand(block: string): HandHistory | null {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 5) return null;

  const header = lines[0];
  const handId = header.match(/#(\d+):/)?.[1] || '0';
  const stakes = header.match(/\(([^)]+)\)/)?.[1] || '';
  const tournamentMatch = header.match(/Tournament #(\d+)/);
  const buyInMatch = header.match(/(\$[\d.]+\+[\d.]+ USD)/);
  const tableInfo = lines.find(l => l.includes('Table '));
  const buttonSeat = parseInt(tableInfo?.match(/Seat #(\d+) is the button/)?.[1] || '1');

  const players: Player[] = [];
  const actions: PlayerAction[] = [];
  const board: string[] = [];
  let currentStreet: PlayerAction['street'] = 'PREFLOP';
  let totalAnteInPot = 0;

  for (const line of lines) {
    const seatMatch = line.match(/^Seat (\d+): (.+?) \(([\d.]+) in chips(?:,\s*([€$£¥]?[\d.]+)\s+bounty)?\)/i);
    if (seatMatch) {
      const bounty = seatMatch[4] ? seatMatch[4].trim() : undefined;
      players.push({ seat: parseInt(seatMatch[1]), name: seatMatch[2].trim(), stack: parseFloat(seatMatch[3]), initialStack: parseFloat(seatMatch[3]), isHero: false, position: '', isActive: true, cards: [], bounty });
      continue;
    }
    const dealtMatch = line.match(/^Dealt to (.+?) \[(.+?)\]/);
    if (dealtMatch) {
      const p = players.find(p => p.name === dealtMatch[1].trim());
      if (p) { p.isHero = true; p.cards = parseCards(dealtMatch[2]); }
      continue;
    }
    if (line.startsWith('*** FLOP ***')) { currentStreet = 'FLOP'; const m = line.match(/\[([^\]]+)\]/); if (m) board.push(...parseCards(m[1])); continue; }
    if (line.startsWith('*** TURN ***')) { currentStreet = 'TURN'; const ms = [...line.matchAll(/\[([^\]]+)\]/g)]; const m = ms[ms.length - 1]; if (m) board.push(...parseCards(m[1]).slice(-1)); continue; }
    if (line.startsWith('*** RIVER ***')) { currentStreet = 'RIVER'; const ms = [...line.matchAll(/\[([^\]]+)\]/g)]; const m = ms[ms.length - 1]; if (m) board.push(...parseCards(m[1]).slice(-1)); continue; }
    if (line.startsWith('*** SHOW DOWN ***') || line.startsWith('*** SUMMARY ***')) { currentStreet = 'SHOWDOWN'; continue; }

    const uncalled = line.match(/^Uncalled bet \(([\d.]+)\) returned to (.+)/i);
    if (uncalled) { actions.push({ playerName: uncalled[2].trim(), type: 'UNCALLED_RETURN', amount: parseFloat(uncalled[1]), street: currentStreet }); continue; }

    const collected = line.match(/^(.+?) collected ([\d.]+) from/i);
    if (collected) { actions.push({ playerName: collected[1].trim(), type: 'COLLECTED', amount: parseFloat(collected[2]), street: currentStreet }); continue; }

    const shows = line.match(/^(.+?): shows \[(.+?)\]/i);
    if (shows) { actions.push({ playerName: shows[1].trim(), type: 'SHOWS', cards: parseCards(shows[2]), street: currentStreet }); continue; }

    const mucks = line.match(/^(.+?): mucks hand/i);
    if (mucks) { actions.push({ playerName: mucks[1].trim(), type: 'MUCKS', street: currentStreet }); continue; }

    const act = line.match(/^(.+?): (posts the ante|posts small blind|posts big blind|calls|folds|raises|checks|bets|collected)(?: \[.+?\])? ?([\d.]+)?(?:(?: to | $)([\d.]+))?/i);
    if (act) {
      const name = act[1].trim(); const raw = act[2].toLowerCase();
      const a1 = act[3] ? parseFloat(act[3]) : 0; const a2 = act[4] ? parseFloat(act[4]) : 0;
      const amount = a2 || a1;
      if (raw.includes('ante')) { const p = players.find(p => p.name === name); if (p) { p.initialStack -= amount; p.stack = p.initialStack; totalAnteInPot += amount; } continue; }
      let type: ActionType = 'CHECK';
      if (raw.includes('small blind')) type = 'POST_SB';
      else if (raw.includes('big blind')) type = 'POST_BB';
      else if (raw.includes('calls')) type = 'CALL';
      else if (raw.includes('folds')) type = 'FOLD';
      else if (raw.includes('raises')) type = 'RAISE';
      else if (raw.includes('bets')) type = 'BET';
      else if (raw.includes('collected')) type = 'COLLECTED';
      actions.push({ playerName: name, type, amount, street: currentStreet });
    }
  }

  if (players.length === 0) return null;
  assignPositions(players, buttonSeat);
  const isKnockout = players.some(p => p.bounty !== undefined);
  return { id: handId, room: 'PokerStars', gameType: "Hold'em No Limit", stakes: stakes || 'N/A', tournamentId: tournamentMatch?.[1], buyIn: buyInMatch?.[1], isKnockout, players, board, actions, totalPot: totalAnteInPot, buttonSeat, summary: buildSummary(players, actions) };
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTY POKER
// ─────────────────────────────────────────────────────────────────────────────
function parsePartyPokerHand(block: string): HandHistory | null {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 5) return null;

  // Hand ID — "Game #12345" or "Game 1771885780695z96r4pbp2yo" (no #)
  const handId = block.match(/Game #?(\w+)/i)?.[1] || '0';

  // Stakes — "$0.50/$1.00" or "25/50" (no $)
  const stakesM = block.match(/\$?([\d.]+)\/\$?([\d.]+)/);
  const stakes  = stakesM ? `${stakesM[1]}/${stakesM[2]}` : 'N/A';

  const tournamentMatch = block.match(/Tournament #(\d+)/i);
  const buttonSeat = parseInt(
    block.match(/Seat (\d+) is the button/i)?.[1] ||
    block.match(/BUTTON: SEAT (\d+)/i)?.[1] || '1'
  );

  // Amounts in PP can be bare "100" or wrapped "(100)" — strip parens
  const ppNum = (s: string | undefined) => s ? parseFloat(s.replace(/[(),]/g, '')) : 0;

  const players:  Player[]       = [];
  const actions:  PlayerAction[] = [];
  const board:    string[]       = [];
  let currentStreet: PlayerAction['street'] = 'PREFLOP';
  let totalAnteInPot = 0;
  let inSummary = false;

  for (const line of lines) {
    if (/^\*\* Summary/i.test(line)) { inSummary = true; currentStreet = 'SHOWDOWN'; continue; }

    // ── Summary lines ───────────────────────────────────────────────────────
    if (inSummary) {
      // "Player3 balance 4716, bet 2831, collected 4716, ..."
      const collM = line.match(/^(.+?) balance [\d.]+, bet [\d.]+, collected ([\d.]+)/i);
      if (collM) { actions.push({ playerName: collM[1].trim(), type: 'COLLECTED', amount: parseFloat(collM[2]), street: currentStreet }); }
      // Cards shown at showdown: "Hero balance 0, lost 1780[ Qs, Kh ] [ description ]"
      //                           "Player3 balance 4716, bet 2831, collected 4716, net +1885[ Td, 8d ] [ ... ]"
      const summCards = line.match(/^(.+?) balance [\d.,]+[^[]*\[ ([^\]]+) \]/i);
      if (summCards) {
        const cards = parseCards(summCards[2]);
        if (cards.length >= 2) {
          const p = players.find(p => p.name === summCards[1].trim());
          if (p && p.cards.length === 0) p.cards = cards;
          actions.push({ playerName: summCards[1].trim(), type: 'SHOWS', cards, street: currentStreet });
        }
      }
      continue;
    }

    // ── Seats ───────────────────────────────────────────────────────────────
    // "Seat 3: Hero (1780)"
    const seatM = line.match(/^Seat (\d+): (.+?) \(([\d,]+)\)\s*$/);
    if (seatM) {
      const name  = seatM[2].trim();
      const stack = parseFloat(seatM[3].replace(/,/g, ''));
      players.push({ seat: parseInt(seatM[1]), name, stack, initialStack: stack, isHero: false, position: '', isActive: true, cards: [] });
      continue;
    }

    // ── Dealt to hero ────────────────────────────────────────────────────────
    const dealt = line.match(/^Dealt to (.+?) \[([^\]]+)\]/i);
    if (dealt) {
      const p = players.find(p => p.name === dealt[1].trim());
      if (p) { p.isHero = true; p.cards = parseCards(dealt[2]); }
      continue;
    }

    // ── Streets ──────────────────────────────────────────────────────────────
    if (/^\*\*\* (FLOP|Board)|Dealing Flop/i.test(line)) {
      currentStreet = 'FLOP'; const m = line.match(/\[([^\]]+)\]/); if (m) board.push(...parseCards(m[1])); continue;
    }
    if (/^\*\*\* TURN|Dealing Turn/i.test(line)) {
      currentStreet = 'TURN'; const ms = [...line.matchAll(/\[([^\]]+)\]/g)]; const m = ms[ms.length-1];
      if (m) { const c = parseCards(m[1]); if (c.length === 1) board.push(c[0]); } continue;
    }
    if (/^\*\*\* RIVER|Dealing River/i.test(line)) {
      currentStreet = 'RIVER'; const ms = [...line.matchAll(/\[([^\]]+)\]/g)]; const m = ms[ms.length-1];
      if (m) { const c = parseCards(m[1]); if (c.length === 1) board.push(c[0]); } continue;
    }
    if (/SHOW DOWN|SHOWDOWN/i.test(line)) { currentStreet = 'SHOWDOWN'; continue; }

    // ── Antes ────────────────────────────────────────────────────────────────
    // "Player1 posts ante (6)"
    const anteM = line.match(/^(.+?) posts ante \(?([\d.]+)\)?/i);
    if (anteM) {
      const p = players.find(p => p.name === anteM[1].trim());
      const amt = parseFloat(anteM[2]);
      if (p) { p.initialStack -= amt; p.stack = p.initialStack; totalAnteInPot += amt; }
      continue;
    }

    // ── Blinds ───────────────────────────────────────────────────────────────
    // "Player6 posts small blind (25)" or "Player6 posts small blind 25"
    const blindM = line.match(/^(.+?) posts (small blind|big blind) \(?([\d.]+)\)?/i);
    if (blindM) {
      const type: ActionType = blindM[2].toLowerCase().includes('small') ? 'POST_SB' : 'POST_BB';
      actions.push({ playerName: blindM[1].trim(), type, amount: parseFloat(blindM[3]), street: currentStreet });
      continue;
    }

    // ── Uncalled ─────────────────────────────────────────────────────────────
    const uncalled = line.match(/^Uncalled bet \(?\$?([\d.]+)\)? returned to (.+)/i);
    if (uncalled) { actions.push({ playerName: uncalled[2].trim(), type: 'UNCALLED_RETURN', amount: parseFloat(uncalled[1]), street: currentStreet }); continue; }

    // ── Collected (inline, not summary) ──────────────────────────────────────
    const wonM = line.match(/^(.+?) (?:collected|wins?|won) \$?([\d.]+)/i);
    if (wonM && !line.startsWith('Seat')) { actions.push({ playerName: wonM[1].trim(), type: 'COLLECTED', amount: parseFloat(wonM[2]), street: currentStreet }); continue; }

    // ── Shows ────────────────────────────────────────────────────────────────
    const showsM = line.match(/^(.+?) shows? \[([^\]]+)\]/i);
    if (showsM) { actions.push({ playerName: showsM[1].trim(), type: 'SHOWS', cards: parseCards(showsM[2]), street: currentStreet }); continue; }

    // ── Actions ──────────────────────────────────────────────────────────────
    // Handles both: "Hero raises 100 to 100"  and  "Player3 calls (100)"
    const actM = line.match(/^(.+?) (folds?|checks?|calls?|bets?|raises?)(?: \(?([\d.]+)\)?)?(?: to \(?([\d.]+)\)?)?/i);
    if (actM) {
      const name   = actM[1].trim();
      const raw    = actM[2].toLowerCase();
      const amount = ppNum(actM[4]) || ppNum(actM[3]);
      const type: ActionType =
        raw.startsWith('fold')  ? 'FOLD'  :
        raw.startsWith('check') ? 'CHECK' :
        raw.startsWith('call')  ? 'CALL'  :
        raw.startsWith('bet')   ? 'BET'   : 'RAISE';
      actions.push({ playerName: name, type, amount, street: currentStreet });
    }
  }

  if (players.length === 0) return null;
  assignPositions(players, buttonSeat);
  return {
    id: handId, room: 'Party Poker', gameType: "Hold'em No Limit", stakes,
    tournamentId: tournamentMatch?.[1],
    players, board, actions, totalPot: totalAnteInPot, buttonSeat,
    summary: buildSummary(players, actions),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GGPOKER
// ─────────────────────────────────────────────────────────────────────────────

// GGPoker formats numbers with commas: "894,124" — strip before parseFloat
function ggNum(s: string): number { return parseFloat(s.replace(/,/g, '')); }

function parseGGPokerHand(block: string): HandHistory | null {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 5) return null;

  const header = lines[0];
  const handId = header.match(/Hand #(\w+)/i)?.[1] || '0';

  // Stakes: "Level40(60,000/120,000)" or "($0.50/$1.00)" or "(0.50/1.00)"
  const stakesMatch = header.match(/\(\$?([\d,.]+)\/\$?([\d,.]+)\)/);
  const stakes = stakesMatch
    ? `${ggNum(stakesMatch[1])}/${ggNum(stakesMatch[2])}`
    : 'N/A';

  const tournamentMatch = header.match(/Tournament #?(\d+)/i);
  const buyInMatch = header.match(/\$?([\d,.]+)\+\$?([\d,.]+)/);
  const buttonSeat = parseInt(
    block.match(/Seat #?(\d+) is the button/i)?.[1] ||
    block.match(/BTN.*Seat.*?(\d+)/i)?.[1] || '1'
  );

  const players: Player[] = [];
  const actions: PlayerAction[] = [];
  const board: string[] = [];
  let currentStreet: PlayerAction['street'] = 'PREFLOP';
  let totalAnteInPot = 0;

  for (const line of lines) {
    // Seat: "Seat 1: Hero (894,124 in chips)" or "Seat 1: Hero (894,124 in chips, $5 bounty)"
    const seatMatch = line.match(/^Seat (\d+): (.+?) \(([\d,]+) in chips(?:,\s*\$?([\d,.]+)\s+bounty)?\)/i);
    if (seatMatch) {
      const bounty = seatMatch[4] ? seatMatch[4].trim() : undefined;
      const stack = ggNum(seatMatch[3]);
      players.push({ seat: parseInt(seatMatch[1]), name: seatMatch[2].trim(), stack, initialStack: stack, isHero: false, position: '', isActive: true, cards: [], bounty });
      continue;
    }

    const dealt = line.match(/^Dealt to (.+?) \[(.+?)\]/i);
    if (dealt) { const p = players.find(p => p.name === dealt[1].trim()); if (p) { p.isHero = true; p.cards = parseCards(dealt[2]); } continue; }

    if (line.startsWith('*** FLOP ***')) { currentStreet = 'FLOP'; const m = line.match(/\[([^\]]+)\]/); if (m) board.push(...parseCards(m[1])); continue; }
    if (line.startsWith('*** TURN ***')) { currentStreet = 'TURN'; const ms = [...line.matchAll(/\[([^\]]+)\]/g)]; const m = ms[ms.length - 1]; if (m) board.push(...parseCards(m[1]).slice(-1)); continue; }
    if (line.startsWith('*** RIVER ***')) { currentStreet = 'RIVER'; const ms = [...line.matchAll(/\[([^\]]+)\]/g)]; const m = ms[ms.length - 1]; if (m) board.push(...parseCards(m[1]).slice(-1)); continue; }
    if (line.startsWith('*** SHOW DOWN ***') || line.startsWith('*** SUMMARY ***')) { currentStreet = 'SHOWDOWN'; continue; }

    // Uncalled bet
    const uncalled = line.match(/^Uncalled bet \(\$?([\d,]+)\) returned to (.+)/i);
    if (uncalled) { actions.push({ playerName: uncalled[2].trim(), type: 'UNCALLED_RETURN', amount: ggNum(uncalled[1]), street: currentStreet }); continue; }

    // Collected
    const collected = line.match(/^(.+?) collected \$?([\d,]+) from/i);
    if (collected) { actions.push({ playerName: collected[1].trim(), type: 'COLLECTED', amount: ggNum(collected[2]), street: currentStreet }); continue; }

    // Ante
    const ante = line.match(/^(.+?): posts (the ante|ante) \$?([\d,]+)/i);
    if (ante) {
      const p = players.find(p => p.name === ante[1].trim());
      const amt = ggNum(ante[3]);
      if (p) { p.initialStack -= amt; p.stack = p.initialStack; totalAnteInPot += amt; }
      continue;
    }

    // Blinds
    const blind = line.match(/^(.+?): posts (small blind|big blind) \$?([\d,]+)/i);
    if (blind) { actions.push({ playerName: blind[1].trim(), type: blind[2].toLowerCase().includes('small') ? 'POST_SB' : 'POST_BB', amount: ggNum(blind[3]), street: currentStreet }); continue; }

    // Actions: calls/raises/bets/folds/checks
    const act = line.match(/^(.+?): (folds|checks|calls|bets|raises)(?: \$?([\d,]+))?(?: to \$?([\d,]+))?/i);
    if (act) {
      const name = act[1].trim(); const raw = act[2].toLowerCase();
      const amount = (act[4] ? ggNum(act[4]) : 0) || (act[3] ? ggNum(act[3]) : 0);
      const type: ActionType = raw === 'folds' ? 'FOLD' : raw === 'checks' ? 'CHECK' : raw === 'calls' ? 'CALL' : raw === 'bets' ? 'BET' : 'RAISE';
      actions.push({ playerName: name, type, amount, street: currentStreet }); continue;
    }

    const shows = line.match(/^(.+?): shows \[(.+?)\]/i);
    if (shows) { actions.push({ playerName: shows[1].trim(), type: 'SHOWS', cards: parseCards(shows[2]), street: currentStreet }); continue; }

    const mucks = line.match(/^(.+?): mucks hand/i);
    if (mucks) { actions.push({ playerName: mucks[1].trim(), type: 'MUCKS', street: currentStreet }); continue; }
  }

  if (players.length === 0) return null;
  assignPositions(players, buttonSeat);
  const isKnockout = players.some(p => p.bounty !== undefined);
  return {
    id: handId, room: 'GGPoker', gameType: "Hold'em No Limit", stakes,
    tournamentId: tournamentMatch?.[1],
    buyIn: buyInMatch ? `$${buyInMatch[1]}+${buyInMatch[2]}` : undefined,
    isKnockout,
    players, board, actions, totalPot: totalAnteInPot, buttonSeat,
    summary: buildSummary(players, actions),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 888 POKER
// ─────────────────────────────────────────────────────────────────────────────
function parse888Hand(block: string): HandHistory | null {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 5) return null;

  const handId = block.match(/Hand #?(\d+)/i)?.[1] || block.match(/Game #?(\d+)/i)?.[1] || '0';
  const stakesM = block.match(/\$?([\d.]+)\/\$?([\d.]+)/);
  const stakes  = stakesM ? `${stakesM[1]}/${stakesM[2]}` : 'N/A';
  const tournamentMatch = block.match(/Tournament #(\d+)/i);

  // 888poker uses "." as thousands separator: "3.598" = 3598 chips
  // Also strips leading $ for cash-game amounts like "$2.00"
  const p888 = (s: string): number => {
    const clean = s.replace(/[$\s,]/g, '');
    const m = clean.match(/^(\d+)\.(\d{3})$/);
    return m ? parseInt(m[1]) * 1000 + parseInt(m[2]) : parseFloat(clean) || 0;
  };

  const players:  Player[]       = [];
  const actions:  PlayerAction[] = [];
  const board:    string[]       = [];
  let currentStreet: PlayerAction['street'] = 'PREFLOP';
  let totalAnteInPot = 0;
  let buttonSeat = 1;
  let sbPlayer   = '';
  let inSummary  = false;

  for (const line of lines) {
    if (/^\*\* Summary/i.test(line)) { inSummary = true; currentStreet = 'SHOWDOWN'; continue; }
    if (/^\*\* First runout/i.test(line)) continue;

    // ── Summary ──────────────────────────────────────────────────────────────
    if (inSummary) {
      // "Lov3d2Two shows [ As, Qs ]"
      const showM = line.match(/^(.+?) shows? \[ ([^\]]+) \]/i);
      if (showM) {
        const cards = parseCards(showM[2]);
        const p = players.find(p => p.name === showM[1].trim());
        if (p && p.cards.length === 0) p.cards = cards;
        actions.push({ playerName: showM[1].trim(), type: 'SHOWS', cards, street: currentStreet });
      }
      // "First runout georgieboy collected [ 7.736 ]" or "georgieboy collected [ 7.736 ]"
      const collM = line.match(/(?:^|\s)(\S+) collected \[ ([\d.]+) \]/i);
      if (collM) actions.push({ playerName: collM[1].trim(), type: 'COLLECTED', amount: p888(collM[2]), street: currentStreet });
      continue;
    }

    // ── Button ───────────────────────────────────────────────────────────────
    const btnM = line.match(/^Seat (\d+) is the (?:button|dealer)/i);
    if (btnM) { buttonSeat = parseInt(btnM[1]); continue; }

    // ── Seats ────────────────────────────────────────────────────────────────
    // "Seat 1: Lov3d2Two ( 3.598 )" or "Seat 1: Player ( $2.00 )"
    const seatM = line.match(/^Seat (\d+): (.+?) \(\s*\$?([\d.,]+)\s*\)\s*$/);
    if (seatM) {
      const stack = p888(seatM[3]);
      players.push({ seat: parseInt(seatM[1]), name: seatM[2].trim(), stack, initialStack: stack, isHero: false, position: '', isActive: true, cards: [] });
      continue;
    }

    // ── Dealt ────────────────────────────────────────────────────────────────
    const dealtM = line.match(/^Dealt to (.+?) \[ ([^\]]+) \]/i);
    if (dealtM) {
      const p = players.find(p => p.name === dealtM[1].trim());
      if (p) { p.isHero = true; p.cards = parseCards(dealtM[2]); }
      continue;
    }

    // ── Streets ──────────────────────────────────────────────────────────────
    if (/\*\* Dealing flop \*\*/i.test(line)) {
      currentStreet = 'FLOP';
      const m = line.match(/\[ ([^\]]+) \]/); if (m) board.push(...parseCards(m[1]));
      continue;
    }
    if (/\*\* Dealing turn \*\*/i.test(line)) {
      currentStreet = 'TURN';
      const m = line.match(/\[ ([^\]]+) \]/); if (m) { const c = parseCards(m[1]); if (c.length === 1) board.push(c[0]); }
      continue;
    }
    if (/\*\* Dealing river \*\*/i.test(line)) {
      currentStreet = 'RIVER';
      const m = line.match(/\[ ([^\]]+) \]/); if (m) { const c = parseCards(m[1]); if (c.length === 1) board.push(c[0]); }
      continue;
    }
    if (/SHOW ?DOWN/i.test(line)) { currentStreet = 'SHOWDOWN'; continue; }

    // ── Antes ────────────────────────────────────────────────────────────────
    const anteM = line.match(/^(.+?) posts ante \[?\$?([\d.,]+)\]?/i);
    if (anteM) {
      const p = players.find(p => p.name === anteM[1].trim());
      const amt = p888(anteM[2]);
      if (p) { p.initialStack -= amt; p.stack = p.initialStack; totalAnteInPot += amt; }
      continue;
    }

    // ── Blinds ───────────────────────────────────────────────────────────────
    const blindM = line.match(/^(.+?)(?::)? posts (small blind|big blind) \[?\$?([\d.,]+)\]?/i);
    if (blindM) {
      const type: ActionType = blindM[2].toLowerCase().includes('small') ? 'POST_SB' : 'POST_BB';
      if (type === 'POST_SB') sbPlayer = blindM[1].trim();
      actions.push({ playerName: blindM[1].trim(), type, amount: p888(blindM[3]), street: currentStreet });
      continue;
    }

    // ── Uncalled ─────────────────────────────────────────────────────────────
    const uncalledM = line.match(/^Uncalled bet \[?\$?([\d.,]+)\]? returned to (.+)/i);
    if (uncalledM) { actions.push({ playerName: uncalledM[2].trim(), type: 'UNCALLED_RETURN', amount: p888(uncalledM[1]), street: currentStreet }); continue; }

    // ── Actions (no colon: "Anton4397 raises [300]" / "cobratomas folds") ────
    if (line.startsWith('**') || line.startsWith('#')) continue;
    const actM = line.match(/^(.+?) (folds?|checks?|calls?|bets?|raises?)(?: \[?\$?([\d.,]+)\]?)?(?: to \[?\$?([\d.,]+)\]?)?/i);
    if (actM && players.find(p => p.name === actM[1].trim())) {
      const name   = actM[1].trim();
      const raw    = actM[2].toLowerCase();
      const amount = (actM[4] ? p888(actM[4]) : 0) || (actM[3] ? p888(actM[3]) : 0);
      const type: ActionType =
        raw.startsWith('fold')  ? 'FOLD'  :
        raw.startsWith('check') ? 'CHECK' :
        raw.startsWith('call')  ? 'CALL'  :
        raw.startsWith('bet')   ? 'BET'   : 'RAISE';
      actions.push({ playerName: name, type, amount, street: currentStreet });
    }
  }

  if (players.length === 0) return null;

  // Infer button from SB if not explicitly set
  if (sbPlayer && buttonSeat === 1) {
    const sorted = [...players].sort((a, b) => a.seat - b.seat);
    const sbIdx  = sorted.findIndex(p => p.name === sbPlayer);
    if (sbIdx !== -1) buttonSeat = sorted[(sbIdx - 1 + sorted.length) % sorted.length].seat;
  }

  assignPositions(players, buttonSeat);
  return {
    id: handId, room: '888 Poker', gameType: "Hold'em No Limit", stakes,
    tournamentId: tournamentMatch?.[1],
    players, board, actions, totalPot: totalAnteInPot, buttonSeat,
    summary: buildSummary(players, actions),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WPN / AMERICAS CARDROOM
// ─────────────────────────────────────────────────────────────────────────────
function parseWPNHand(block: string): HandHistory | null {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 5) return null;

  const handId = block.match(/Game #(\d+)/i)?.[1] || block.match(/#(\d+)/)?.[1] || '0';
  const stakesMatch = block.match(/\$([\d.]+)\/\$([\d.]+)/) || block.match(/([\d.]+)\/([\d.]+)/);
  const stakes = stakesMatch ? `${stakesMatch[1]}/${stakesMatch[2]} USD` : 'N/A';
  const buttonSeat = parseInt(block.match(/Seat #?(\d+) is the button/i)?.[1] || '1');

  const players: Player[] = [];
  const actions: PlayerAction[] = [];
  const board: string[] = [];
  let currentStreet: PlayerAction['street'] = 'PREFLOP';

  for (const line of lines) {
    // Seats: "Seat 1: PlayerName (1000)" or "Seat 1: PlayerName ($10.00)"
    const seatMatch = line.match(/^Seat (\d+)[:\s]+(.+?) \(\$?([\d.]+)\)/i);
    if (seatMatch && !line.includes('is the button') && !line.includes('sitting out')) {
      players.push({ seat: parseInt(seatMatch[1]), name: seatMatch[2].trim(), stack: parseFloat(seatMatch[3]), initialStack: parseFloat(seatMatch[3]), isHero: false, position: '', isActive: true, cards: [] });
      continue;
    }

    const dealt = line.match(/^Dealt to (.+?) \[(.+?)\]/i);
    if (dealt) { const p = players.find(p => p.name === dealt[1].trim()); if (p) { p.isHero = true; p.cards = parseCards(dealt[2]); } continue; }

    // WPN hero cards: "PlayerName: Card1 Card2" (appears after "Set-Up:" section)
    const heroCards = line.match(/^\[ (.+?): ([2-9TJQKA][shdc]) ([2-9TJQKA][shdc]) \]$/i);
    if (heroCards) { const p = players.find(p => p.name === heroCards[1].trim()); if (p) { p.isHero = true; p.cards = [heroCards[2], heroCards[3]]; } continue; }

    if (line.startsWith('*** FLOP ***') || line.match(/^Flop:/i)) { currentStreet = 'FLOP'; const m = line.match(/\[([^\]]+)\]/); if (m) board.push(...parseCards(m[1])); continue; }
    if (line.startsWith('*** TURN ***') || line.match(/^Turn:/i)) { currentStreet = 'TURN'; const ms = [...line.matchAll(/\[([^\]]+)\]/g)]; const m = ms[ms.length - 1]; if (m) board.push(...parseCards(m[1]).slice(-1)); continue; }
    if (line.startsWith('*** RIVER ***') || line.match(/^River:/i)) { currentStreet = 'RIVER'; const ms = [...line.matchAll(/\[([^\]]+)\]/g)]; const m = ms[ms.length - 1]; if (m) board.push(...parseCards(m[1]).slice(-1)); continue; }
    if (/SHOW DOWN|SHOWDOWN/i.test(line)) { currentStreet = 'SHOWDOWN'; continue; }

    const uncalled = line.match(/^Uncalled bet \(?\$?([\d.]+)\)? returned to (.+)/i);
    if (uncalled) { actions.push({ playerName: uncalled[2].trim(), type: 'UNCALLED_RETURN', amount: parseFloat(uncalled[1]), street: currentStreet }); continue; }

    const collected = line.match(/^(.+?) (?:collected|wins?)(?: a pot of)? \$?([\d.]+)/i);
    if (collected && !line.startsWith('Seat')) { actions.push({ playerName: collected[1].trim(), type: 'COLLECTED', amount: parseFloat(collected[2]), street: currentStreet }); continue; }

    const blind = line.match(/^(.+?): posts (small blind|big blind|ante) \$?([\d.]+)/i);
    if (blind) {
      const t = blind[2].toLowerCase();
      if (t === 'ante') { const p = players.find(p => p.name === blind[1].trim()); if (p) { p.initialStack -= parseFloat(blind[3]); p.stack = p.initialStack; } continue; }
      actions.push({ playerName: blind[1].trim(), type: t.includes('small') ? 'POST_SB' : 'POST_BB', amount: parseFloat(blind[3]), street: currentStreet }); continue;
    }

    // WPN action: "PlayerName: Raises 150 to 300" or "PlayerName: Calls 100"
    const act = line.match(/^(.+?): (Folds?|Checks?|Calls?|Raises?|Bets?)(?: \$?([\d.]+))?(?: to \$?([\d.]+))?/i);
    if (act) {
      const name = act[1].trim(); const raw = act[2].toLowerCase();
      const amount = (act[4] ? parseFloat(act[4]) : 0) || (act[3] ? parseFloat(act[3]) : 0);
      const type: ActionType = raw.startsWith('fold') ? 'FOLD' : raw.startsWith('check') ? 'CHECK' : raw.startsWith('call') ? 'CALL' : raw.startsWith('bet') ? 'BET' : 'RAISE';
      actions.push({ playerName: name, type, amount, street: currentStreet }); continue;
    }

    const shows = line.match(/^(.+?): shows? \[(.+?)\]/i);
    if (shows) { actions.push({ playerName: shows[1].trim(), type: 'SHOWS', cards: parseCards(shows[2]), street: currentStreet }); continue; }
    const mucks = line.match(/^(.+?): mucks hand/i);
    if (mucks) { actions.push({ playerName: mucks[1].trim(), type: 'MUCKS', street: currentStreet }); continue; }
  }

  if (players.length === 0) return null;
  assignPositions(players, buttonSeat);
  return { id: handId, room: 'WPN/ACR', gameType: "Hold'em No Limit", stakes, players, board, actions, totalPot: 0, buttonSeat, summary: buildSummary(players, actions) };
}

// ─────────────────────────────────────────────────────────────────────────────
// WINAMAX
// ─────────────────────────────────────────────────────────────────────────────
function parseWinamaxHand(block: string): HandHistory | null {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 5) return null;

  const header = lines[0];
  // "Winamax Poker - CashGame - HandId: #12345678-001 - Holdem no limit (€0.05/€0.10)"
  const handId = header.match(/HandId: #([\w-]+)/i)?.[1]?.replace(/-\d+$/, '') || '0';
  const stakesMatch = header.match(/[€$]([\d.]+)\/[€$]([\d.]+)/);
  const stakes = stakesMatch ? `${stakesMatch[1]}/${stakesMatch[2]}` : 'N/A';
  const tournamentMatch = header.match(/Tournament "([^"]+)"/i);

  const tableInfo = lines.find(l => l.startsWith('Table:') || l.includes('is the button'));
  const buttonSeat = parseInt(tableInfo?.match(/Seat #?(\d+) is the button/i)?.[1] || '1');

  const players: Player[] = [];
  const actions: PlayerAction[] = [];
  const board: string[] = [];
  let currentStreet: PlayerAction['street'] = 'PREFLOP';

  for (const line of lines) {
    const seatMatch = line.match(/^Seat (\d+): (.+?) \(([\d]+)\)/i);
    if (seatMatch) { players.push({ seat: parseInt(seatMatch[1]), name: seatMatch[2].trim(), stack: parseFloat(seatMatch[3]), initialStack: parseFloat(seatMatch[3]), isHero: false, position: '', isActive: true, cards: [] }); continue; }

    const dealt = line.match(/^Dealt to (.+?) \[(.+?)\]/i);
    if (dealt) { const p = players.find(p => p.name === dealt[1].trim()); if (p) { p.isHero = true; p.cards = parseCards(dealt[2]); } continue; }

    if (line.startsWith('*** PRE-FLOP ***')) { currentStreet = 'PREFLOP'; continue; }
    if (line.startsWith('*** FLOP ***')) { currentStreet = 'FLOP'; const m = line.match(/\[([^\]]+)\]/); if (m) board.push(...parseCards(m[1])); continue; }
    if (line.startsWith('*** TURN ***')) { currentStreet = 'TURN'; const ms = [...line.matchAll(/\[([^\]]+)\]/g)]; const m = ms[ms.length - 1]; if (m) board.push(...parseCards(m[1]).slice(-1)); continue; }
    if (line.startsWith('*** RIVER ***')) { currentStreet = 'RIVER'; const ms = [...line.matchAll(/\[([^\]]+)\]/g)]; const m = ms[ms.length - 1]; if (m) board.push(...parseCards(m[1]).slice(-1)); continue; }
    if (line.startsWith('*** SHOWDOWN ***') || line.startsWith('*** SUMMARY ***')) { currentStreet = 'SHOWDOWN'; continue; }

    const uncalled = line.match(/^Uncalled bet \(([\d]+)\) returned to (.+)/i);
    if (uncalled) { actions.push({ playerName: uncalled[2].trim(), type: 'UNCALLED_RETURN', amount: parseFloat(uncalled[1]), street: currentStreet }); continue; }

    const collected = line.match(/^(.+?) collected ([\d]+) from/i);
    if (collected) { actions.push({ playerName: collected[1].trim(), type: 'COLLECTED', amount: parseFloat(collected[2]), street: currentStreet }); continue; }

    const ante = line.match(/^(.+?) posts ante ([\d]+)/i);
    if (ante) { const p = players.find(p => p.name === ante[1].trim()); if (p) { p.initialStack -= parseFloat(ante[2]); p.stack = p.initialStack; } continue; }

    const blind = line.match(/^(.+?) posts (small blind|big blind) ([\d]+)/i);
    if (blind) { actions.push({ playerName: blind[1].trim(), type: blind[2].toLowerCase().includes('small') ? 'POST_SB' : 'POST_BB', amount: parseFloat(blind[3]), street: currentStreet }); continue; }

    const act = line.match(/^(.+?): (folds|checks|calls|bets|raises)(?: ([\d]+))?(?: to ([\d]+))?/i);
    if (act) {
      const name = act[1].trim(); const raw = act[2].toLowerCase();
      const amount = (act[4] ? parseFloat(act[4]) : 0) || (act[3] ? parseFloat(act[3]) : 0);
      const type: ActionType = raw === 'folds' ? 'FOLD' : raw === 'checks' ? 'CHECK' : raw === 'calls' ? 'CALL' : raw === 'bets' ? 'BET' : 'RAISE';
      actions.push({ playerName: name, type, amount, street: currentStreet }); continue;
    }

    const shows = line.match(/^(.+?): shows \[(.+?)\]/i);
    if (shows) { actions.push({ playerName: shows[1].trim(), type: 'SHOWS', cards: parseCards(shows[2]), street: currentStreet }); continue; }
    const mucks = line.match(/^(.+?): mucks hand/i);
    if (mucks) { actions.push({ playerName: mucks[1].trim(), type: 'MUCKS', street: currentStreet }); continue; }
  }

  if (players.length === 0) return null;
  assignPositions(players, buttonSeat);
  return { id: handId, room: 'Winamax', gameType: "Hold'em No Limit", stakes, tournamentId: tournamentMatch?.[1], players, board, actions, totalPot: 0, buttonSeat, summary: buildSummary(players, actions) };
}

// ─────────────────────────────────────────────────────────────────────────────
// IGNITION / BODOG
// ─────────────────────────────────────────────────────────────────────────────
function parseIgnitionHand(block: string): HandHistory | null {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 5) return null;

  const header = lines[0];
  const handId    = header.match(/Hand #(\d+)/)?.[1] || '0';
  const stakesParts = header.match(/\((\d[\d,]*)\/(\d[\d,]*)\)/);
  const stakes    = stakesParts ? `${stakesParts[1].replace(/,/g,'')}/${stakesParts[2].replace(/,/g,'')}` : 'N/A';
  const tournamentMatch = header.match(/Tournament #(\d+)/);

  // Strip [ME] tag to get canonical player name
  const normName = (s: string) => s.replace(/\s*\[ME\]/i, '').trim();
  const ignNum   = (s: string) => parseInt(s.replace(/,/g, ''), 10);

  const players:  Player[]       = [];
  const actions:  PlayerAction[] = [];
  const board:    string[]       = [];
  let currentStreet: PlayerAction['street'] = 'PREFLOP';
  let totalAnteInPot = 0;
  let holesDealt     = false; // used to distinguish blind all-in vs action all-in
  let inSummary      = false;

  for (const line of lines) {
    if (line.startsWith('*** SUMMARY ***')) { inSummary = true; currentStreet = 'SHOWDOWN'; continue; }
    if (inSummary) continue;

    // ── Seats ──────────────────────────────────────────────────────────────
    // "Seat 644: UTG (242,664 in chips)"  /  "Seat 803: UTG+5 [ME] (88,888 in chips)"
    const seatM = line.match(/^Seat \d+: (.+?) \(([\d,]+) in chips\)/);
    if (seatM) {
      const rawName = seatM[1].trim();
      const name    = normName(rawName);
      const isHero  = /\[ME\]/i.test(rawName);
      const stack   = ignNum(seatM[2]);
      players.push({ seat: players.length + 1, name, stack, initialStack: stack, isHero, position: '', isActive: true, cards: [] });
      continue;
    }

    // ── Street markers ──────────────────────────────────────────────────────
    if (line.startsWith('*** HOLE CARDS ***'))  { holesDealt = true; currentStreet = 'PREFLOP'; continue; }
    if (line.startsWith('*** FLOP ***'))  { currentStreet = 'FLOP';  const m = line.match(/\[([^\]]+)\]/); if (m) board.push(...parseCards(m[1])); continue; }
    if (line.startsWith('*** TURN ***'))  { currentStreet = 'TURN';  const ms = [...line.matchAll(/\[([^\]]+)\]/g)]; const m = ms[ms.length-1]; if (m) board.push(...parseCards(m[1]).slice(-1)); continue; }
    if (line.startsWith('*** RIVER ***')) { currentStreet = 'RIVER'; const ms = [...line.matchAll(/\[([^\]]+)\]/g)]; const m = ms[ms.length-1]; if (m) board.push(...parseCards(m[1]).slice(-1)); continue; }

    // ── Skip noise lines ────────────────────────────────────────────────────
    if (/: (?:Set dealer|Table leave|Table enter|Sit out|Re-join|Ranking|Stand|Prize Cash)/i.test(line)) continue;

    // ── All action lines follow "NAME [ME]? : REST" pattern ─────────────────
    const colonIdx = line.indexOf(' : ');
    if (colonIdx === -1) continue;

    const rawActor  = line.slice(0, colonIdx).trim();
    const actorName = normName(rawActor);
    const rest      = line.slice(colonIdx + 3).trim();
    const player    = players.find(p => p.name === actorName);

    // Hole cards: "Card dealt to a spot [3c 4c]"
    const cardM = rest.match(/^Card dealt to a spot \[([^\]]+)\]/i);
    if (cardM && player) { player.cards = parseCards(cardM[1]); continue; }

    // Ante: "Ante chip 2400"
    const anteM = rest.match(/^Ante chip ([\d,]+)/i);
    if (anteM && player) {
      const amt = ignNum(anteM[1]);
      player.initialStack -= amt; player.stack = player.initialStack; totalAnteInPot += amt;
      continue;
    }

    // Small blind / Big blind
    const sbM = rest.match(/^Small blind ([\d,]+)/i);
    if (sbM) { actions.push({ playerName: actorName, type: 'POST_SB', amount: ignNum(sbM[1]), street: currentStreet }); continue; }
    const bbM = rest.match(/^Big blind ([\d,]+)/i);
    if (bbM) { actions.push({ playerName: actorName, type: 'POST_BB', amount: ignNum(bbM[1]), street: currentStreet }); continue; }

    // Return uncalled portion
    const uncalledM = rest.match(/^Return uncalled portion of bet ([\d,]+)/i);
    if (uncalledM) { actions.push({ playerName: actorName, type: 'UNCALLED_RETURN', amount: ignNum(uncalledM[1]), street: currentStreet }); continue; }

    // Hand Result / Side Pot (winner)
    const resultM = rest.match(/^Hand Result(?:-Side Pot)? ([\d,]+)/i);
    if (resultM) { actions.push({ playerName: actorName, type: 'COLLECTED', amount: ignNum(resultM[1]), street: currentStreet }); continue; }

    // Showdown: "Showdown [cards] (rank)"
    const showM = rest.match(/^Showdown \[([^\]]+)\]/i);
    if (showM) { actions.push({ playerName: actorName, type: 'SHOWS', cards: parseCards(showM[1]), street: currentStreet }); continue; }

    // Mucks or "Does not show" — cards still visible in HH, treat as SHOWS
    const mucksM = rest.match(/^(?:Mucks|Does not show) \[([^\]]+)\]/i);
    if (mucksM) { actions.push({ playerName: actorName, type: 'SHOWS', cards: parseCards(mucksM[1]), street: currentStreet }); continue; }

    // Folds (plain, timeout, disconnect variants)
    if (/^Folds?(?:\(|$)/i.test(rest) || /^Fold(?:\(|$)/i.test(rest)) {
      actions.push({ playerName: actorName, type: 'FOLD', amount: 0, street: currentStreet }); continue;
    }

    // Check
    if (/^Checks?$/i.test(rest)) {
      actions.push({ playerName: actorName, type: 'CHECK', amount: 0, street: currentStreet }); continue;
    }

    // Call: "Call 6000"
    const callM = rest.match(/^Call ([\d,]+)/i);
    if (callM) { actions.push({ playerName: actorName, type: 'CALL', amount: ignNum(callM[1]), street: currentStreet }); continue; }

    // All-in raise: "All-in(raise) 61288 to 61288"
    const allinRaiseM = rest.match(/^All-in\(raise\) [\d,]+ to ([\d,]+)/i);
    if (allinRaiseM) { actions.push({ playerName: actorName, type: 'RAISE', amount: ignNum(allinRaiseM[1]), street: currentStreet }); continue; }

    // All-in without (raise): blind post all-in OR call all-in
    const allinM = rest.match(/^All-in ([\d,]+)$/i);
    if (allinM) {
      const amt  = ignNum(allinM[1]);
      const type: ActionType = !holesDealt ? 'POST_BB' : 'CALL';
      actions.push({ playerName: actorName, type, amount: amt, street: currentStreet }); continue;
    }

    // Raise: "Raises 30000 to 30000"
    const raiseM = rest.match(/^Raises? [\d,]+ to ([\d,]+)/i);
    if (raiseM) { actions.push({ playerName: actorName, type: 'RAISE', amount: ignNum(raiseM[1]), street: currentStreet }); continue; }

    // Bet: "Bets 12000"
    const betM = rest.match(/^Bets? ([\d,]+)/i);
    if (betM) { actions.push({ playerName: actorName, type: 'BET', amount: ignNum(betM[1]), street: currentStreet }); continue; }
  }

  if (players.length === 0) return null;

  // Positions are encoded in player names — map to standard labels
  const POS_MAP: Record<string, string> = {
    'Dealer': 'BTN', 'Small Blind': 'SB', 'Big Blind': 'BB',
    'UTG': 'UTG', 'UTG+1': 'UTG+1', 'UTG+2': 'UTG+2',
    'UTG+3': 'UTG+3', 'UTG+4': 'UTG+4', 'UTG+5': 'UTG+5',
  };
  players.forEach(p => { p.position = POS_MAP[p.name] ?? p.name; });

  const dealerPlayer = players.find(p => p.name === 'Dealer');
  const buttonSeat   = dealerPlayer?.seat ?? 1;

  return {
    id: handId, room: 'Bodog/Ignition', gameType: "Hold'em No Limit", stakes,
    tournamentId: tournamentMatch?.[1],
    players, board, actions, totalPot: totalAnteInPot, buttonSeat,
    summary: buildSummary(players, actions),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT DETECTION & ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

type RoomFormat = 'pokerstars' | 'ggpoker' | 'partypoker' | '888' | 'wpn' | 'winamax' | 'ignition';

function detectFormat(text: string): RoomFormat {
  if (/Ignitionpoker\.com Hand #|Ignition Hand #|Bodog Hand #/i.test(text)) return 'ignition';
  if (text.includes('PokerStars Hand #')) return 'pokerstars';
  // GGPoker: "Poker Hand #TM..." or "Poker Hand #HD..." (no "PokerStars" prefix)
  if (/^Poker Hand #[A-Z]/m.test(text) || /GGPoker.*Hand #|PokerStars.*GGPoker/i.test(text)) return 'ggpoker';
  // 888 must come BEFORE partypoker — 888 headers also contain "Hand History for Game"
  if (/888poker/i.test(text)) return '888';
  if (/Hand History for Game/i.test(text) || /\*{5} Hand #/i.test(text)) return 'partypoker';
  if (/Winamax Poker/i.test(text)) return 'winamax';
  if (/Game #\d+.*Hold'em|ACR|Americas Cardroom|Winning Poker/i.test(text)) return 'wpn';
  // fallback: try pokerstars-like (many rooms export PS-compatible format)
  return 'pokerstars';
}

function splitBlocks(text: string, format: RoomFormat): string[] {
  const splitters: Record<RoomFormat, RegExp> = {
    pokerstars: /(?=PokerStars Hand #)/i,
    ggpoker:    /(?=Poker Hand #)/i,
    partypoker: /(?=\*{5} Hand(?:History| #| ID))/i,
    '888':      /(?=888poker)/i,
    wpn:        /(?=Game #\d)/i,
    winamax:    /(?=Winamax Poker)/i,
    ignition:   /(?=Ignitionpoker\.com Hand #|Ignition Hand #|Bodog Hand #)/i,
  };
  return text.split(splitters[format]).filter(b => b.trim().length > 50);
}

export const parseHandHistory = (rawText: string): HandHistory[] => {
  const format = detectFormat(rawText);
  const blocks = splitBlocks(rawText, format);

  const parsers: Record<RoomFormat, (b: string) => HandHistory | null> = {
    pokerstars: parsePokerStarsHand,
    ggpoker:    parseGGPokerHand,
    partypoker: parsePartyPokerHand,
    '888':      parse888Hand,
    wpn:        parseWPNHand,
    winamax:    parseWinamaxHand,
    ignition:   parseIgnitionHand,
  };

  const results: HandHistory[] = [];
  for (const block of blocks) {
    try {
      const hand = parsers[format](block);
      if (hand) { hand.rawText = block.trim(); results.push(hand); }
    } catch {
      // skip malformed block
    }
  }
  return results;
};
