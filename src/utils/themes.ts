
export interface Theme {
  id: string;
  name: string;
  felt: string;
  rail: string;
  railBorder: string;
  bg: string;
  swatch: string; // vivid color for UI swatch button
}

export const THEMES: Theme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    felt: 'radial-gradient(ellipse at 50% 60%, #1a3560 0%, #060e1e 100%)',
    rail: '#0a1628',
    railBorder: '#1e3a5f',
    bg: '#02040a',
    swatch: '#3b82f6',
  },
  {
    id: 'classic',
    name: 'Classic',
    felt: 'radial-gradient(ellipse at 50% 60%, #1e6b38 0%, #0a2e18 100%)',
    rail: '#0c2818',
    railBorder: '#2a6b38',
    bg: '#04100a',
    swatch: '#22c55e',
  },
  {
    id: 'vegas',
    name: 'Vegas',
    felt: 'radial-gradient(ellipse at 50% 60%, #6b1c1c 0%, #2a0b0b 100%)',
    rail: '#220e0e',
    railBorder: '#7c2c2c',
    bg: '#0a0404',
    swatch: '#ef4444',
  },
  {
    id: 'carbon',
    name: 'Carbon',
    felt: 'radial-gradient(ellipse at 50% 60%, #2e2e2e 0%, #0e0e0e 100%)',
    rail: '#161616',
    railBorder: '#333333',
    bg: '#000000',
    swatch: '#71717a',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    felt: 'radial-gradient(ellipse at 50% 60%, #0d4d68 0%, #051e2a 100%)',
    rail: '#061e2a',
    railBorder: '#0e5068',
    bg: '#020810',
    swatch: '#06b6d4',
  },
  {
    id: 'purple',
    name: 'Purple',
    felt: 'radial-gradient(ellipse at 50% 60%, #3b1470 0%, #130428 100%)',
    rail: '#120330',
    railBorder: '#4a1d95',
    bg: '#07020e',
    swatch: '#a855f7',
  },
];

export const DEFAULT_THEME = 'midnight';

export function getTheme(id: string): Theme {
  return THEMES.find(t => t.id === id) ?? THEMES[0];
}
