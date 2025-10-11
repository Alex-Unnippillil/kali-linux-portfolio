export interface PlayerPosition {
  x: number;
  y: number;
}

export interface SerializedState {
  board: string[];
  player: PlayerPosition;
  moves: number;
  pushes: number;
}

export interface BestStats {
  moves: number;
  pushes: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export type ProgressSnapshot = Record<string, SerializedState>;

export const SCORE_BASE = 1_000_000;

const clampScore = (value: number) => (value < 0 ? 0 : value);

export const makeLevelKey = (level: string[] | undefined): string => {
  if (!Array.isArray(level) || level.length === 0) return 'lvl-0';
  const text = level.join('\n');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return `lvl-${hash.toString(16)}`;
};

export const serializeState = (state: {
  board: string[][];
  player: PlayerPosition;
  moves: number;
  pushes: number;
}): SerializedState => ({
  board: state.board.map((row) => row.join('')),
  player: { ...state.player },
  moves: state.moves,
  pushes: state.pushes,
});

export const deserializeState = (
  saved: SerializedState,
): {
  board: string[][];
  player: PlayerPosition;
  moves: number;
  pushes: number;
} => ({
  board: saved.board.map((row) => row.split('')),
  player: saved.player,
  moves: saved.moves ?? 0,
  pushes: saved.pushes ?? 0,
});

const boardsEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((row, index) => row === b[index]);

const statesEqual = (a: SerializedState, b: SerializedState) =>
  a.moves === b.moves &&
  a.pushes === b.pushes &&
  a.player.x === b.player.x &&
  a.player.y === b.player.y &&
  boardsEqual(a.board, b.board);

export const updateProgressSnapshot = (
  snapshot: ProgressSnapshot,
  key: string,
  state: SerializedState,
): ProgressSnapshot => {
  const existing = snapshot[key];
  if (existing && statesEqual(existing, state)) return snapshot;
  return { ...snapshot, [key]: state };
};

export const removeProgressSnapshot = (
  snapshot: ProgressSnapshot,
  key: string,
): ProgressSnapshot => {
  if (!(key in snapshot)) return snapshot;
  const next = { ...snapshot };
  delete next[key];
  return next;
};

export const readProgressSnapshot = (
  snapshot: ProgressSnapshot | null | undefined,
  key: string,
): SerializedState | null => {
  if (!snapshot) return null;
  const value = snapshot[key];
  if (!value) return null;
  if (
    !Array.isArray(value.board) ||
    typeof value.player?.x !== 'number' ||
    typeof value.player?.y !== 'number'
  ) {
    return null;
  }
  return value;
};

export const encodeScore = (stats: BestStats): number =>
  clampScore(SCORE_BASE - stats.moves * 1000 - stats.pushes);

export const shouldUpdateBest = (
  current: BestStats | null,
  candidate: BestStats | null,
): boolean => {
  if (!candidate) return false;
  if (!current) return true;
  if (candidate.moves < current.moves) return true;
  if (candidate.moves === current.moves && candidate.pushes < current.pushes)
    return true;
  return false;
};

export const loadBestFromStorage = (
  storage: StorageLike | null,
  key: string,
): BestStats | null => {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.moves === 'number' &&
      typeof parsed.pushes === 'number'
    ) {
      return { moves: parsed.moves, pushes: parsed.pushes };
    }
  } catch {
    /* ignore malformed data */
  }
  return null;
};

export const saveBestToStorage = (
  storage: StorageLike | null,
  key: string,
  stats: BestStats,
): BestStats => {
  if (!storage) return stats;
  const current = loadBestFromStorage(storage, key);
  if (!shouldUpdateBest(current, stats)) return current ?? stats;
  try {
    storage.setItem(key, JSON.stringify(stats));
  } catch {
    /* ignore storage errors */
  }
  return stats;
};

export const clearBestInStorage = (
  storage: StorageLike | null,
  key: string,
): void => {
  if (!storage || typeof storage.removeItem !== 'function') return;
  try {
    storage.removeItem(key);
  } catch {
    /* ignore storage errors */
  }
};

export const sanitizeSnapshot = (
  value: unknown,
): ProgressSnapshot => {
  if (!value || typeof value !== 'object') return {};
  const snapshot: ProgressSnapshot = {};
  for (const [key, entry] of Object.entries(value as Record<string, any>)) {
    if (typeof key !== 'string') continue;
    if (!entry) continue;
    const board = Array.isArray(entry.board)
      ? entry.board.filter((row: unknown) => typeof row === 'string')
      : null;
    if (!board || !entry.player) continue;
    const { x, y } = entry.player;
    if (typeof x !== 'number' || typeof y !== 'number') continue;
    snapshot[key] = {
      board,
      player: { x, y },
      moves: Number(entry.moves) || 0,
      pushes: Number(entry.pushes) || 0,
    };
  }
  return snapshot;
};

