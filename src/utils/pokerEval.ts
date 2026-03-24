
const RANK_IDX: Record<string, number> = {
  '2':0,'3':1,'4':2,'5':3,'6':4,'7':5,'8':6,'9':7,'T':8,'J':9,'Q':10,'K':11,'A':12,
};

const HAND_NAMES = [
  'High Card','Pair','Two Pair','Three of a Kind',
  'Straight','Flush','Full House','Four of a Kind','Straight Flush',
];

interface Card { r: number; s: string; }

function pc(str: string): Card {
  return { r: RANK_IDX[str[0]] ?? -1, s: str[1] };
}

/** Score a specific 5-card hand — higher score = stronger hand */
function eval5(cards: Card[]): number {
  const s = [...cards].sort((a, b) => b.r - a.r);
  const R = s.map(c => c.r);
  const S = s.map(c => c.s);

  const isFlush = S.every(x => x === S[0]);

  // Straight detection (including wheel A-2-3-4-5)
  let isStraight = false;
  let straightTop = 0;
  if (new Set(R).size === 5) {
    if (R[0] - R[4] === 4) {
      isStraight = true; straightTop = R[0];
    } else if (R[0] === 12 && R[1] === 3 && R[2] === 2 && R[3] === 1 && R[4] === 0) {
      isStraight = true; straightTop = 3; // wheel top = 5 (rank 3)
    }
  }

  // Rank frequency groups, sorted by count desc then rank desc
  const freq: Record<number, number> = {};
  R.forEach(r => { freq[r] = (freq[r] || 0) + 1; });
  const groups = Object.entries(freq)
    .map(([r, c]) => [+r, c] as [number, number])
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const counts = groups.map(g => g[1]);
  const kickers = groups.map(g => g[0]);

  let type: number;
  if (isFlush && isStraight) type = 8;
  else if (counts[0] === 4) type = 7;
  else if (counts[0] === 3 && counts[1] === 2) type = 6;
  else if (isFlush) type = 5;
  else if (isStraight) type = 4;
  else if (counts[0] === 3) type = 3;
  else if (counts[0] === 2 && counts[1] === 2) type = 2;
  else if (counts[0] === 2) type = 1;
  else type = 0;

  // For straights only the top card matters for tiebreaking
  const k = isStraight ? [straightTop, 0, 0, 0, 0] : kickers;
  const B = 15;
  return type * B**5 + (k[0]??0)*B**4 + (k[1]??0)*B**3 + (k[2]??0)*B**2 + (k[3]??0)*B + (k[4]??0);
}

/** Best 5-card score from n cards (n >= 5) */
function evalBest(cards: Card[]): number {
  const n = cards.length;
  if (n < 5) return -1;
  if (n === 5) return eval5(cards);
  let best = -1;
  for (let a = 0; a < n-4; a++)
  for (let b = a+1; b < n-3; b++)
  for (let c = b+1; c < n-2; c++)
  for (let d = c+1; d < n-1; d++)
  for (let e = d+1; e < n; e++) {
    const sc = eval5([cards[a],cards[b],cards[c],cards[d],cards[e]]);
    if (sc > best) best = sc;
  }
  return best;
}

/** Evaluate hole cards + board and return score + hand name */
export function evaluateCards(holeCards: string[], board: string[]): { score: number; name: string } | null {
  const all = [...holeCards, ...board].map(pc);
  if (all.some(c => c.r < 0) || all.length < 5) return null;
  const score = evalBest(all);
  const type = Math.floor(score / 15**5);
  return { score, name: HAND_NAMES[type] ?? '' };
}

/** Monte Carlo equity — handles incomplete boards via random runouts */
export function estimateEquity(
  heroHole: string[], oppHole: string[], board: string[], trials = 600
): { hero: number; opp: number; tie: number } {
  const used = new Set([...heroHole, ...oppHole, ...board]);
  const deck: string[] = [];
  for (const r of '23456789TJQKA') for (const s of 'hdcs') {
    const c = r + s;
    if (!used.has(c)) deck.push(c);
  }

  const needed = 5 - board.length;

  // Complete board — deterministic
  if (needed <= 0) {
    const h = evaluateCards(heroHole, board)?.score ?? -1;
    const o = evaluateCards(oppHole, board)?.score ?? -1;
    return h > o ? { hero: 100, opp: 0, tie: 0 }
      : h < o ? { hero: 0, opp: 100, tie: 0 }
      : { hero: 50, opp: 50, tie: 0 };
  }

  let hw = 0, ow = 0, tw = 0;
  for (let t = 0; t < trials; t++) {
    // Partial Fisher-Yates
    const d = [...deck];
    for (let i = 0; i < needed; i++) {
      const j = i + Math.floor(Math.random() * (d.length - i));
      [d[i], d[j]] = [d[j], d[i]];
    }
    const runout = [...board, ...d.slice(0, needed)];
    const h = evaluateCards(heroHole, runout)?.score ?? -1;
    const o = evaluateCards(oppHole, runout)?.score ?? -1;
    if (h > o) hw++;
    else if (h < o) ow++;
    else tw++;
  }

  return {
    hero: Math.round(hw / trials * 100),
    opp:  Math.round(ow  / trials * 100),
    tie:  Math.round(tw  / trials * 100),
  };
}

/** Board texture description */
export function getBoardTexture(board: string[]): string | null {
  if (board.length < 3) return null;

  const suits = board.map(c => c[1]);
  const sf: Record<string, number> = {};
  suits.forEach(s => { sf[s] = (sf[s] || 0) + 1; });
  const maxSuit = Math.max(...Object.values(sf));

  const rNums = board.map(c => RANK_IDX[c[0]] ?? 0);
  const rf: Record<number, number> = {};
  rNums.forEach(r => { rf[r] = (rf[r] || 0) + 1; });
  const maxRank = Math.max(...Object.values(rf));

  const parts: string[] = [];

  // Suit texture
  if (board.length === 3) {
    if (maxSuit === 3)      parts.push('Monotone');
    else if (maxSuit === 2) parts.push('Two-tone');
    else                    parts.push('Rainbow');
  } else {
    if (maxSuit >= 4)       parts.push('Monotone');
    else if (maxSuit === 3) parts.push('FD');
    else                    parts.push('Rainbow');
  }

  // Paired board
  if (maxRank >= 3)      parts.push('Trips');
  else if (maxRank === 2) parts.push('Paired');

  // Connectivity: consecutive or 1-gap ranks
  const uniq = [...new Set(rNums)].sort((a, b) => a - b);
  let conn = 0;
  for (let i = 0; i < uniq.length - 1; i++) {
    if (uniq[i + 1] - uniq[i] <= 2) conn++;
  }
  if (conn >= 2)                             parts.push('Connected');
  else if (conn >= 1 && board.length === 3) parts.push('SD');

  return parts.join(' · ');
}
