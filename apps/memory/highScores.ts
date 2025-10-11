export type MemoryTimerMode = 'countup' | 'countdown';

export interface MemoryModeDescriptor {
  variant?: string;
  player?: number;
  size: number;
  timerMode: MemoryTimerMode;
  deckType: string;
  patternTheme?: string;
  themeName?: string;
  previewTime?: number;
}

export interface MemoryScore {
  moves: number;
  time: number;
  updatedAt: number;
}

type ScoreDictionary = Record<string, MemoryScore>;

const STORAGE_KEY = 'game:memory:highscores';

const isBrowser = typeof window !== 'undefined';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const sanitizeScore = (score: MemoryScore | undefined): MemoryScore | null => {
  if (!score) return null;
  if (!isFiniteNumber(score.moves) || !isFiniteNumber(score.time)) return null;
  return {
    moves: score.moves,
    time: score.time,
    updatedAt: score.updatedAt ?? Date.now(),
  };
};

const encodeDescriptor = (descriptor: MemoryModeDescriptor): string => {
  const parts = [
    `variant=${descriptor.variant ?? 'default'}`,
    `player=${descriptor.player ?? 1}`,
    `size=${descriptor.size}`,
    `timer=${descriptor.timerMode}`,
    `deck=${descriptor.deckType}`,
  ];
  if (descriptor.patternTheme) parts.push(`pattern=${descriptor.patternTheme}`);
  if (descriptor.themeName) parts.push(`theme=${descriptor.themeName}`);
  if (isFiniteNumber(descriptor.previewTime)) {
    parts.push(`preview=${descriptor.previewTime}`);
  }
  return parts.join('|');
};

const readScores = (): ScoreDictionary => {
  if (!isBrowser) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ScoreDictionary;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    // ignore malformed storage
  }
  return {};
};

const writeScores = (scores: ScoreDictionary) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // ignore write errors
  }
};

export const getMemoryScore = (
  descriptor: MemoryModeDescriptor,
): MemoryScore | null => {
  const key = encodeDescriptor(descriptor);
  const stored = sanitizeScore(readScores()[key]);
  return stored;
};

export const recordMemoryScore = (
  descriptor: MemoryModeDescriptor,
  result: { moves: number; time: number },
): MemoryScore => {
  const key = encodeDescriptor(descriptor);
  const scores = readScores();
  const existing = sanitizeScore(scores[key]);

  const moves = isFiniteNumber(result.moves)
    ? result.moves
    : existing?.moves ?? 0;
  const time = isFiniteNumber(result.time)
    ? result.time
    : existing?.time ?? 0;

  const bestMoves = existing ? Math.min(existing.moves, moves) : moves;
  const bestTime = existing ? Math.min(existing.time, time) : time;

  const next: MemoryScore = {
    moves: bestMoves,
    time: bestTime,
    updatedAt: Date.now(),
  };

  scores[key] = next;
  writeScores(scores);
  return next;
};

export const clearMemoryScores = () => {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

export const listMemoryScores = (): ScoreDictionary => readScores();

