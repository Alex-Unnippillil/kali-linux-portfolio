export const PLATFORMER_PB_STORAGE_KEY = 'platformer:pbs:v1';

export type PBEntry = {
  bestTimeMs: number;
  bestDeaths: number;
  bestCoins: number;
  updatedAt: number;
};

export type RunStats = {
  timeMs: number;
  deaths: number;
  coins: number;
};

export type PBMap = Record<string, PBEntry>;

function normalizeEntry(entry: unknown): PBEntry | null {
  if (!entry || typeof entry !== 'object') return null;
  const candidate = entry as Partial<PBEntry>;
  if (
    typeof candidate.bestTimeMs !== 'number'
    || typeof candidate.bestDeaths !== 'number'
    || typeof candidate.bestCoins !== 'number'
    || typeof candidate.updatedAt !== 'number'
  ) {
    return null;
  }

  return {
    bestTimeMs: candidate.bestTimeMs,
    bestDeaths: candidate.bestDeaths,
    bestCoins: candidate.bestCoins,
    updatedAt: candidate.updatedAt,
  };
}

export function loadPlatformerPBs(): PBMap {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(PLATFORMER_PB_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};

    return Object.entries(parsed).reduce<PBMap>((acc, [level, entry]) => {
      const normalized = normalizeEntry(entry);
      if (normalized) acc[level] = normalized;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export function savePlatformerPBs(pbs: PBMap): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(PLATFORMER_PB_STORAGE_KEY, JSON.stringify(pbs));
  } catch {
    // ignore storage quota / permissions issues for demo safety
  }
}

export function isBetterRun(candidate: RunStats, currentBest?: PBEntry | null): boolean {
  if (!currentBest) return true;
  if (candidate.timeMs < currentBest.bestTimeMs) return true;
  if (candidate.timeMs > currentBest.bestTimeMs) return false;
  if (candidate.deaths < currentBest.bestDeaths) return true;
  if (candidate.deaths > currentBest.bestDeaths) return false;
  if (candidate.coins > currentBest.bestCoins) return true;
  return false;
}

export function updatePB(levelIndex: number, runStats: RunStats): {
  pbs: PBMap;
  isNewPB: boolean;
  bestForLevel: PBEntry | null;
} {
  const pbs = loadPlatformerPBs();
  const key = String(levelIndex);
  const currentBest = pbs[key];

  if (!isBetterRun(runStats, currentBest)) {
    return {
      pbs,
      isNewPB: false,
      bestForLevel: currentBest || null,
    };
  }

  const bestForLevel: PBEntry = {
    bestTimeMs: runStats.timeMs,
    bestDeaths: runStats.deaths,
    bestCoins: runStats.coins,
    updatedAt: Date.now(),
  };

  const nextPBs: PBMap = {
    ...pbs,
    [key]: bestForLevel,
  };

  savePlatformerPBs(nextPBs);

  return {
    pbs: nextPBs,
    isNewPB: true,
    bestForLevel,
  };
}
