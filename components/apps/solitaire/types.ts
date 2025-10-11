import type { GameState } from './engine';

export type Variant = 'klondike' | 'spider' | 'freecell';

export interface Stats {
  gamesPlayed: number;
  gamesWon: number;
  bestScore: number;
  bestTime: number;
  dailyStreak: number;
  lastDaily: string | null;
}

export const createDefaultStats = (): Stats => ({
  gamesPlayed: 0,
  gamesWon: 0,
  bestScore: 0,
  bestTime: 0,
  dailyStreak: 0,
  lastDaily: null,
});

export interface SolitaireSnapshot {
  version: number;
  variant: Variant;
  drawMode: 1 | 3;
  passLimit: number;
  game: GameState;
  moves: number;
  time: number;
  bankroll: number;
  stats: Stats;
  isDaily: boolean;
  won: boolean;
  winnableOnly: boolean;
  timestamp: number;
}
