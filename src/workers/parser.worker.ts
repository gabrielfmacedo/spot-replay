/**
 * Web Worker — off-loads hand history parsing to a background thread.
 * The main thread sends raw text; the worker replies with { hands, failedCount, totalBlocks }.
 */
import { parseHandHistory } from '../services/parser';

const BATCH_SIZE = 50;

self.onmessage = (e: MessageEvent<{ text: string }>) => {
  const { text } = e.data;

  const blocks = text
    .split(/(?=PokerStars Hand #|\*{5} Hand(?:History| #| ID)|888poker|Winamax Poker|(?:^|\n)Poker Hand #|(?:^|\n)Game #\d)/i)
    .filter(b => b.trim().length > 50);

  const total = blocks.length;
  if (total === 0) {
    self.postMessage({ type: 'done', hands: [], failedCount: 0, totalBlocks: 0 });
    return;
  }

  let processed = 0;
  let totalFailed = 0;
  const allHands: import('../types').HandHistory[] = [];

  const processChunk = () => {
    const end = Math.min(processed + BATCH_SIZE, total);
    const result = parseHandHistory(blocks.slice(processed, end).join('\n\n'));
    allHands.push(...result.hands);
    totalFailed += result.failedCount;
    processed = end;

    // Report progress
    self.postMessage({ type: 'progress', percent: Math.round((processed / total) * 100) });

    if (processed < total) {
      // Yield to the event loop between chunks
      setTimeout(processChunk, 0);
    } else {
      self.postMessage({ type: 'done', hands: allHands, failedCount: totalFailed, totalBlocks: total });
    }
  };

  processChunk();
};
