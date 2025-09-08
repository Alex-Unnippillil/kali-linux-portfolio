export type GameState = {
  board: number[][];
  highest: number;
  won: boolean;
  lost: boolean;
};

const STORAGE_KEY = '2048-state';

export const loadState = (): GameState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      if (
        Array.isArray(parsed.board) &&
        typeof parsed.highest === 'number' &&
        typeof parsed.won === 'boolean' &&
        typeof parsed.lost === 'boolean'
      ) {
        return parsed;
      }
    }
  } catch {
    // ignore malformed data
  }
  return null;
};

export const saveState = (state: GameState): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore write errors
  }
};

export const clearState = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore remove errors
  }
};
