import { HandHistory } from '../types';

export function encodeHand(hand: HandHistory): string {
  try {
    return btoa(encodeURIComponent(JSON.stringify(hand)));
  } catch {
    return '';
  }
}

export function decodeHand(encoded: string): HandHistory | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded)));
  } catch {
    return null;
  }
}

export function getSharedHandFromURL(): HandHistory | null {
  try {
    const hash = window.location.hash;
    const match = hash.match(/[#&]h=([^&]+)/);
    if (match) return decodeHand(match[1]);
  } catch { /* ignore */ }
  return null;
}
