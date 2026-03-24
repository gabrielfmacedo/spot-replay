
import { HandHistory } from '../types';

const SUIT_SYMBOL: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
const SUIT_COLOR:  Record<string, string> = { h: '#ef4444', d: '#ef4444', c: '#e2e8f0', s: '#e2e8f0' };

// 9-seat positions around an oval (as fractions of canvas size)
const SEAT_POSITIONS = [
  { x: 0.50, y: 0.04 }, // 1 – top center
  { x: 0.80, y: 0.10 }, // 2 – top right
  { x: 0.96, y: 0.40 }, // 3 – right
  { x: 0.90, y: 0.78 }, // 4 – bottom right
  { x: 0.67, y: 0.92 }, // 5 – bottom center-right
  { x: 0.33, y: 0.92 }, // 6 – bottom center-left
  { x: 0.10, y: 0.78 }, // 7 – bottom left
  { x: 0.04, y: 0.40 }, // 8 – left
  { x: 0.20, y: 0.10 }, // 9 – top left
];

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawCard(ctx: CanvasRenderingContext2D, code: string, x: number, y: number, w: number, h: number) {
  const rank = code[0] ?? '?';
  const suit = code[1] ?? 'h';
  const color = SUIT_COLOR[suit] ?? '#fff';
  const sym   = SUIT_SYMBOL[suit] ?? '';

  drawRoundRect(ctx, x, y, w, h, 4);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = `bold ${Math.round(h * 0.35)}px monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(rank, x + 3, y + 2);

  ctx.font = `${Math.round(h * 0.28)}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(sym, x + w - 2, y + h - 2);
}

export function exportHandAsImage(
  hand: HandHistory,
  gameState: { currentPot: number; visibleBoard: string[]; playerStates: Record<string, any>; street: string },
  bigBlindValue: number,
  displayMode: 'chips' | 'bb',
  themeFelt: string  // CSS gradient string (used as label only; we rasterize a solid)
): void {
  const W = 960, H = 540;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Background ──────────────────────────────────────────────────────────
  ctx.fillStyle = '#020408';
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // ── Table oval ──────────────────────────────────────────────────────────
  const cx = W / 2, cy = H / 2 + 20;
  const rx = 380, ry = 168;

  // Rail (outer border)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + 18, ry + 18, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#0a1628';
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 3;
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Felt (inner)
  const feltGrad = ctx.createRadialGradient(cx, cy - 20, 10, cx, cy, rx);
  feltGrad.addColorStop(0, '#0f2040');
  feltGrad.addColorStop(1, '#060e1e');
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = feltGrad;
  ctx.fill();
  ctx.restore();

  // ── Pot ──────────────────────────────────────────────────────────────────
  const potLabel = displayMode === 'bb'
    ? `${(gameState.currentPot / bigBlindValue).toFixed(1)} bb`
    : Math.floor(gameState.currentPot).toLocaleString();

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  drawRoundRect(ctx, cx - 60, cy - 52, 120, 28, 14);
  ctx.fill();
  ctx.fillStyle = '#60a5fa';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('POT', cx - 30, cy - 38);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(potLabel, cx + 14, cy - 38);

  // ── Board cards ──────────────────────────────────────────────────────────
  const board = gameState.visibleBoard;
  if (board.length > 0) {
    const CW = 38, CH = 54, gap = 6;
    const totalW = board.length * CW + (board.length - 1) * gap;
    const startX = cx - totalW / 2;
    const startY = cy - CH / 2 + 5;
    board.forEach((code: string, i: number) => {
      drawCard(ctx, code, startX + i * (CW + gap), startY, CW, CH);
    });
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPOT REPLAY', cx, cy + 10);
  }

  // ── Players ──────────────────────────────────────────────────────────────
  hand.players.forEach(player => {
    const seatIdx = player.seat - 1;
    if (seatIdx < 0 || seatIdx >= SEAT_POSITIONS.length) return;
    const sp = SEAT_POSITIONS[seatIdx];
    const px = sp.x * W, py = sp.y * H;
    const ps = gameState.playerStates[player.name];

    const isHero     = player.isHero;
    const hasFolded  = ps?.hasFolded ?? false;
    const isActing   = ps?.isActing ?? false;
    const isDealer   = hand.buttonSeat === player.seat;

    const stack = ps?.stack ?? player.initialStack;
    const stackLabel = displayMode === 'bb'
      ? `${(stack / bigBlindValue).toFixed(1)}bb`
      : stack.toLocaleString();

    const bw = 80, bh = 34;
    const bx = px - bw / 2, by = py - bh / 2;

    // Box
    drawRoundRect(ctx, bx, by, bw, bh, 8);
    if (isActing) {
      ctx.fillStyle = 'rgba(234,179,8,0.15)';
      ctx.strokeStyle = '#eab308';
    } else if (isHero) {
      ctx.fillStyle = 'rgba(59,130,246,0.15)';
      ctx.strokeStyle = '#3b82f6';
    } else if (hasFolded) {
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    }
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();

    // Name
    ctx.fillStyle = hasFolded ? 'rgba(255,255,255,0.25)' : isHero ? '#93c5fd' : '#e2e8f0';
    ctx.font = `bold 9px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const displayName = (player.isHero ? 'Hero' : player.name).slice(0, 9);
    ctx.fillText(displayName, px, by + 5);

    // Stack
    ctx.fillStyle = hasFolded ? 'rgba(255,255,255,0.2)' : '#94a3b8';
    ctx.font = '8px monospace';
    ctx.textBaseline = 'bottom';
    ctx.fillText(stackLabel, px, by + bh - 4);

    // Position badge
    if (player.position) {
      ctx.fillStyle = isHero ? '#3b82f6' : 'rgba(255,255,255,0.2)';
      drawRoundRect(ctx, bx - 16, by + 2, 14, 12, 3);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 6px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.position.slice(0, 3), bx - 9, by + 8);
    }

    // Dealer button
    if (isDealer) {
      ctx.beginPath();
      ctx.arc(bx + bw + 8, by + bh / 2, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 6px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('D', bx + bw + 8, by + bh / 2);
    }

    // Bet amount
    const bet = ps?.currentBet;
    if (bet && bet > 0) {
      const betLabel = displayMode === 'bb' ? `${(bet / bigBlindValue).toFixed(1)}` : String(Math.round(bet));
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      drawRoundRect(ctx, px - 18, by + bh + 2, 36, 12, 4);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(betLabel, px, by + bh + 8);
    }

    // Revealed cards (showdown)
    const rev = ps?.revealedCards;
    if (rev?.length >= 2) {
      drawCard(ctx, rev[0], px - 20, by - 22, 18, 26);
      drawCard(ctx, rev[1], px - 1,  by - 22, 18, 26);
    }
  });

  // ── Street badge ─────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(37,99,235,0.15)';
  drawRoundRect(ctx, W - 90, 10, 78, 18, 6);
  ctx.fill();
  ctx.fillStyle = '#60a5fa';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(gameState.street, W - 51, 19);

  // ── Header info ───────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`${hand.room}  ·  ${hand.stakes}  ·  #${hand.id.slice(0, 12)}`, 14, 12);

  // Hero cards (top left if available)
  const hero = hand.players.find(p => p.isHero);
  if (hero?.cards?.length === 2) {
    drawCard(ctx, hero.cards[0], 14, 32, 24, 34);
    drawCard(ctx, hero.cards[1], 41, 32, 24, 34);
  }

  // ── Branding ──────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('SPOT REPLAY', W - 14, H - 10);

  // ── Download ──────────────────────────────────────────────────────────────
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spot_replay_${hand.id.slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}
