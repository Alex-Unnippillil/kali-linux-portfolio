import type { Grid } from './logic';

export interface PuzzleState {
  grid: Grid;
  hintsUsed: number;
}

const PREFIX = 'game:nonogram:';

export const saveProgress = (name: string, state: PuzzleState): void => {
  try {
    localStorage.setItem(`${PREFIX}${name}`, JSON.stringify(state));
  } catch {
    /* ignore */
  }
};

export const loadProgress = (name: string): PuzzleState | null => {
  try {
    const raw = localStorage.getItem(`${PREFIX}${name}`);
    return raw ? (JSON.parse(raw) as PuzzleState) : null;
  } catch {
    return null;
  }
};

export const clearProgress = (name: string): void => {
  try {
    localStorage.removeItem(`${PREFIX}${name}`);
  } catch {
    /* ignore */
  }
};

const progressApi = { saveProgress, loadProgress, clearProgress };
export default progressApi;
