import type { Cell, WinningCell } from '../../../games/connect-four/solver';

export type Token = Exclude<Cell, null>;
export type MatchMode = 'single' | 'best_of_3';

export type MatchState = {
  red: number;
  yellow: number;
  draws: number;
  games: number;
  matchWinner: Token | null;
};

export type CpuStats = {
  wins: number;
  losses: number;
  draws: number;
  streak: number;
};

export type LocalStats = {
  redWins: number;
  yellowWins: number;
  draws: number;
};

export type StatsState = {
  cpu: Record<'easy' | 'normal' | 'hard', CpuStats>;
  local: LocalStats;
};

export type HistoryEntry = {
  board: Cell[][];
  currentPlayer: Token;
  winner: Token | 'draw' | null;
  winningCells: WinningCell[];
};

export type MoveRecord = { col: number; token: Token };
