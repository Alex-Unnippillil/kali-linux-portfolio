import type { MatchState, StatsState } from './types';

export const GAP = 6;
export const MIN_CELL = 32;
export const MAX_CELL = 64;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const PALETTES = {
  default: {
    label: 'Blue/Orange',
    tokens: {
      red: { label: 'Blue', primary: '#3b82f6', secondary: '#1d4ed8', highlight: '#93c5fd' },
      yellow: { label: 'Orange', primary: '#fb923c', secondary: '#c2410c', highlight: '#fed7aa' },
    },
    hints: { positive: [34, 197, 94], negative: [239, 68, 68] },
  },
  protanopia: {
    label: 'Teal/Gold',
    tokens: {
      red: { label: 'Teal', primary: '#14b8a6', secondary: '#0f766e', highlight: '#99f6e4' },
      yellow: { label: 'Gold', primary: '#f59e0b', secondary: '#b45309', highlight: '#fde68a' },
    },
    hints: { positive: [20, 184, 166], negative: [245, 158, 11] },
  },
  deuteranopia: {
    label: 'Purple/Sand',
    tokens: {
      red: { label: 'Purple', primary: '#8b5cf6', secondary: '#5b21b6', highlight: '#ddd6fe' },
      yellow: { label: 'Sand', primary: '#fbbf24', secondary: '#b45309', highlight: '#fef3c7' },
    },
    hints: { positive: [139, 92, 246], negative: [251, 191, 36] },
  },
  tritanopia: {
    label: 'Magenta/Cyan',
    tokens: {
      red: { label: 'Magenta', primary: '#ec4899', secondary: '#9d174d', highlight: '#fbcfe8' },
      yellow: { label: 'Cyan', primary: '#06b6d4', secondary: '#0e7490', highlight: '#cffafe' },
    },
    hints: { positive: [6, 182, 212], negative: [236, 72, 153] },
  },
};

export const PATTERNS = {
  red: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.7) 0 18%, transparent 20%)',
  yellow: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.6) 0 4px, transparent 4px 8px)',
};

export const DEFAULT_MATCH_STATE: MatchState = {
  red: 0,
  yellow: 0,
  draws: 0,
  games: 0,
  matchWinner: null,
};

export const DEFAULT_STATS: StatsState = {
  cpu: {
    easy: { wins: 0, losses: 0, draws: 0, streak: 0 },
    normal: { wins: 0, losses: 0, draws: 0, streak: 0 },
    hard: { wins: 0, losses: 0, draws: 0, streak: 0 },
  },
  local: { redWins: 0, yellowWins: 0, draws: 0 },
};

export const buildTokenGradient = (primary: string, secondary: string, highlight: string) =>
  `radial-gradient(circle at 30% 30%, ${highlight}, ${primary} 45%, ${secondary} 100%)`;

export const getHintStyle = (
  score: number | null,
  paletteName: keyof typeof PALETTES,
  highContrast: boolean,
) => {
  if (typeof score !== 'number') return undefined;
  const mag = Math.min(1, Math.abs(score) / 12);
  const alpha = (highContrast ? 0.12 : 0.06) + mag * (highContrast ? 0.32 : 0.22);
  const palette = PALETTES[paletteName] ?? PALETTES.default;
  const color = score >= 0 ? palette.hints.positive : palette.hints.negative;
  return { backgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})` };
};
