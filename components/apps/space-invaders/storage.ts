export const BEST_SCORE_STORAGE_KEY = 'space-invaders-best-score';

const toBestScore = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.floor(numeric));
};

export const readBestScore = () => {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(BEST_SCORE_STORAGE_KEY);
    if (raw === null) return 0;
    try {
      return toBestScore(JSON.parse(raw));
    } catch {
      return toBestScore(raw);
    }
  } catch {
    return 0;
  }
};

export const writeBestScore = (score: number) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(toBestScore(score)));
  } catch {
    // ignore write errors
  }
};

