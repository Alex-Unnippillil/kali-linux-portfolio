export type Difficulty = 'easy' | 'normal' | 'hard';

export type HighScoreMap = Record<Difficulty, number>;

const STORAGE_KEY = 'flappy-bird:high-scores';

const DEFAULT_SCORES: HighScoreMap = {
  easy: 0,
  normal: 0,
  hard: 0,
};

const getStorage = (storage?: Storage | null): Storage | null => {
  if (typeof window === 'undefined') return storage ?? null;
  return storage ?? window.localStorage;
};

const cloneDefaults = (): HighScoreMap => ({ ...DEFAULT_SCORES });

const isValidScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Load persisted high scores, falling back to zeros if unavailable. */
export function loadHighScores(storage?: Storage | null): HighScoreMap {
  const store = getStorage(storage);
  if (!store) return cloneDefaults();

  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw) as Partial<Record<Difficulty, unknown>>;
    const scores = cloneDefaults();
    (Object.keys(scores) as Difficulty[]).forEach((key) => {
      const value = parsed[key];
      if (isValidScore(value)) {
        scores[key] = Math.floor(value);
      }
    });
    return scores;
  } catch {
    return cloneDefaults();
  }
}

/**
 * Record a score for a difficulty, returning the updated high score map.
 * When a new personal best is achieved the value is persisted immediately.
 */
export function recordScore(
  difficulty: Difficulty,
  score: number,
  storage?: Storage | null,
): HighScoreMap {
  const store = getStorage(storage);
  const scores = loadHighScores(store);
  if (score > scores[difficulty]) {
    scores[difficulty] = Math.floor(score);
    if (store) {
      try {
        store.setItem(STORAGE_KEY, JSON.stringify(scores));
      } catch {
        /* ignore storage write errors */
      }
    }
  }
  return { ...scores };
}

/** Clear persisted high scores. Useful for tests and debug tooling. */
export function clearHighScores(storage?: Storage | null): void {
  const store = getStorage(storage);
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export default loadHighScores;
