const PREFIX = "simon:best:";

export const getBestStreakKey = (mode: string, timing: string): string =>
  `${PREFIX}${mode}:${timing}`;

const parseScore = (raw: string | null): number => {
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
};

export const loadBestStreak = (mode: string, timing: string): number => {
  try {
    return parseScore(globalThis.localStorage?.getItem(getBestStreakKey(mode, timing)) ?? null);
  } catch {
    return 0;
  }
};

export const saveBestStreak = (
  mode: string,
  timing: string,
  streak: number,
): number => {
  if (!Number.isFinite(streak) || streak < 0) {
    return loadBestStreak(mode, timing);
  }
  const normalized = Math.floor(streak);
  try {
    const current = loadBestStreak(mode, timing);
    const best = normalized > current ? normalized : current;
    if (best > current) {
      globalThis.localStorage?.setItem(getBestStreakKey(mode, timing), String(best));
    }
    return best;
  } catch {
    return normalized;
  }
};

export const clearBestStreak = (mode: string, timing: string): void => {
  try {
    globalThis.localStorage?.removeItem(getBestStreakKey(mode, timing));
  } catch {
    /* ignore */
  }
};
