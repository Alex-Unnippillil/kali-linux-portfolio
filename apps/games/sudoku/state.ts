import { Cell, cloneCell, createCell } from './cell';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type PuzzleMode = 'daily' | 'random';

export const MAX_HISTORY = 200;

export interface SudokuSettings {
  difficulty: Difficulty;
  mode: PuzzleMode;
  pencilMode: boolean;
  highlightPeers: boolean;
  highlightSameDigit: boolean;
  showIncorrect: boolean;
}

export interface PuzzleIdentity {
  id: string;
  seed: number;
  date: string | null;
}

export type HistoryEntry =
  | {
      kind: 'value' | 'candidate';
      r: number;
      c: number;
      before: Cell;
      after: Cell;
    }
  | {
      kind: 'batch-candidates';
      changes: { r: number; c: number; before: Cell; after: Cell }[];
    };

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash >>> 0;
};

export const formatLocalDate = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const createDailySeed = (difficulty: Difficulty, date: Date = new Date()): number =>
  hashString(`${formatLocalDate(date)}:${difficulty}`);

export const createPuzzleIdentity = (
  mode: PuzzleMode,
  difficulty: Difficulty,
  seed: number,
  date: Date = new Date(),
): PuzzleIdentity => {
  if (mode === 'daily') {
    const dateStr = formatLocalDate(date);
    return {
      id: `daily:${dateStr}:${difficulty}`,
      seed: createDailySeed(difficulty, date),
      date: dateStr,
    };
  }
  return {
    id: `random:${seed}:${difficulty}`,
    seed,
    date: null,
  };
};

export const cloneBoard = (board: Cell[][]): Cell[][] =>
  board.map((row) => row.map((cell) => cloneCell(cell)));

export const serializeBoard = (board: Cell[][]): { values: number[][]; candidates: number[][][] } => ({
  values: board.map((row) => row.map((cell) => cell.value)),
  candidates: board.map((row) => row.map((cell) => cell.candidates.slice())),
});

export const deserializeBoard = (
  values: number[][],
  candidates?: number[][][],
): Cell[][] => {
  return values.map((row, r) =>
    row.map((value, c) => {
      const cell = createCell(value);
      if (candidates && candidates[r] && candidates[r][c]) {
        cell.candidates = candidates[r][c].slice();
      }
      return cell;
    }),
  );
};

export const cellsEqual = (a: Cell, b: Cell): boolean =>
  a.value === b.value && a.candidates.join(',') === b.candidates.join(',');

export const replaceCell = (board: Cell[][], r: number, c: number, cell: Cell): Cell[][] => {
  const next = board.map((row) => row.slice());
  next[r] = next[r].map((current, idx) => (idx === c ? cloneCell(cell) : cloneCell(current)));
  return next;
};

export const applyHistoryEntry = (
  board: Cell[][],
  entry: HistoryEntry,
  direction: 'undo' | 'redo',
): Cell[][] => {
  if (entry.kind === 'batch-candidates') {
    let nextBoard = cloneBoard(board);
    entry.changes.forEach((change) => {
      const cell = direction === 'undo' ? change.before : change.after;
      nextBoard = replaceCell(nextBoard, change.r, change.c, cell);
    });
    return nextBoard;
  }
  const cell = direction === 'undo' ? entry.before : entry.after;
  return replaceCell(board, entry.r, entry.c, cell);
};

export const pushHistory = (past: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] => {
  const next = past.concat(entry);
  if (next.length <= MAX_HISTORY) return next;
  return next.slice(next.length - MAX_HISTORY);
};

export const safeParseJSON = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};
