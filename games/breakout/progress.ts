export interface BreakoutProgress {
  stage: number;
  lives: number;
  score: number;
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const PROGRESS_KEY = 'breakout:progress';
export const DEFAULT_LIVES = 3;

export const createDefaultProgress = (stage = 1): BreakoutProgress => ({
  stage: stage > 0 ? stage : 1,
  lives: DEFAULT_LIVES,
  score: 0,
});

const clampNumber = (
  value: number,
  min: number,
  fallback: number,
  max?: number,
) => {
  if (!Number.isFinite(value)) return fallback;
  const clamped = Math.max(value, min);
  if (typeof max === 'number') {
    return Math.min(clamped, max);
  }
  return clamped;
};

export const sanitizeProgress = (
  progress: Partial<BreakoutProgress> | null | undefined,
): BreakoutProgress => {
  if (!progress) return createDefaultProgress();
  const stage = clampNumber(progress.stage ?? 1, 1, 1);
  const rawLives = progress.lives ?? DEFAULT_LIVES;
  const lives =
    rawLives < 0
      ? DEFAULT_LIVES
      : clampNumber(rawLives, 0, DEFAULT_LIVES, DEFAULT_LIVES);
  const score = clampNumber(progress.score ?? 0, 0, 0);
  return { stage, lives, score };
};

const getStorage = (storage?: StorageLike): StorageLike | null => {
  if (storage) return storage;
  if (typeof window === 'undefined') return null;
  try {
    if (window.localStorage) return window.localStorage;
  } catch {
    return null;
  }
  return null;
};

export const loadProgress = (storage?: StorageLike): BreakoutProgress => {
  const target = getStorage(storage);
  if (!target) return createDefaultProgress();
  try {
    const raw = target.getItem(PROGRESS_KEY);
    if (!raw) return createDefaultProgress();
    const parsed = JSON.parse(raw);
    return sanitizeProgress(parsed);
  } catch {
    return createDefaultProgress();
  }
};

export const saveProgress = (
  progress: BreakoutProgress,
  storage?: StorageLike,
): void => {
  const target = getStorage(storage);
  if (!target) return;
  try {
    target.setItem(PROGRESS_KEY, JSON.stringify(sanitizeProgress(progress)));
  } catch {
    /* ignore storage errors */
  }
};

export const resetProgress = (
  storage?: StorageLike,
  stage = 1,
): BreakoutProgress => {
  const next = createDefaultProgress(stage);
  const target = getStorage(storage);
  if (target) {
    try {
      target.removeItem(PROGRESS_KEY);
    } catch {
      /* ignore storage errors */
    }
  }
  saveProgress(next, storage);
  return next;
};

interface AdvanceOptions {
  scoreBonus?: number;
  lives?: number;
}

export const advanceStage = (
  progress: BreakoutProgress,
  options: AdvanceOptions = {},
): BreakoutProgress => {
  const bonus = options.scoreBonus ?? 0;
  const lives = options.lives ?? DEFAULT_LIVES;
  const next: BreakoutProgress = {
    stage: progress.stage + 1,
    lives: clampNumber(lives, 0, DEFAULT_LIVES, DEFAULT_LIVES),
    score: clampNumber(progress.score + bonus, 0, 0),
  };
  return next;
};
