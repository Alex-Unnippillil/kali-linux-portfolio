export type Board = number[][]; // 0 represents empty cell

export interface Hint {
  row: number;
  col: number;
  value: number;
  type: 'single' | 'pointing';
}

export interface UserStats {
  puzzlesSolved: number;
  streak: number;
  lastSolved: string; // ISO date string
  achievements: string[];
}
