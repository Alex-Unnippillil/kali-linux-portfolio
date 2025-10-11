export type TicTacToeResult = 'win' | 'loss' | 'draw';

export interface VariantStats {
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  bestStreak: number;
}

export type StatsByVariant = Record<string, VariantStats>;

export const STATS_STORAGE_KEY = 'tictactoe:stats';
const LEGACY_STORAGE_KEY = 'tictactoeStats';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const normalizeRecord = (value: unknown): VariantStats | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Partial<VariantStats> & {
    wins?: unknown;
    losses?: unknown;
    draws?: unknown;
    streak?: unknown;
    bestStreak?: unknown;
  };
  const wins = isFiniteNumber(record.wins) ? record.wins : 0;
  const losses = isFiniteNumber(record.losses) ? record.losses : 0;
  const draws = isFiniteNumber(record.draws) ? record.draws : 0;
  const streak = isFiniteNumber(record.streak) ? record.streak : 0;
  const bestCandidate = isFiniteNumber(record.bestStreak)
    ? record.bestStreak
    : Math.max(streak, wins);
  return {
    wins,
    losses,
    draws,
    streak,
    bestStreak: Math.max(bestCandidate, streak, wins),
  };
};

const normalizeMap = (value: unknown): StatsByVariant => {
  if (!value || typeof value !== 'object') return {};
  const result: StatsByVariant = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const normalized = normalizeRecord(raw);
    if (normalized) result[key] = normalized;
  }
  return result;
};

export const defaultVariantStats = (): VariantStats => ({
  wins: 0,
  losses: 0,
  draws: 0,
  streak: 0,
  bestStreak: 0,
});

export const createVariantKey = (mode: string, size: number) => `${mode}-${size}`;

export const loadStats = (): StatsByVariant => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STATS_STORAGE_KEY);
    if (raw) return normalizeMap(JSON.parse(raw));
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const normalized = normalizeMap(JSON.parse(legacy));
      saveStats(normalized);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      return normalized;
    }
  } catch {
    // ignore parse errors and fall through
  }
  return {};
};

export const saveStats = (stats: StatsByVariant) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore write failures
  }
};

export const applyResult = (
  stats: StatsByVariant,
  variantKey: string,
  result: TicTacToeResult,
): StatsByVariant => {
  const current = stats[variantKey]
    ? { ...stats[variantKey] }
    : defaultVariantStats();
  switch (result) {
    case 'win':
      current.wins += 1;
      current.streak += 1;
      current.bestStreak = Math.max(current.bestStreak, current.streak);
      break;
    case 'loss':
      current.losses += 1;
      current.streak = 0;
      break;
    case 'draw':
      current.draws += 1;
      break;
    default:
      break;
  }
  return {
    ...stats,
    [variantKey]: current,
  };
};

export const resetVariantStats = (
  stats: StatsByVariant,
  variantKey: string,
): StatsByVariant => {
  if (!(variantKey in stats)) return stats;
  const next = { ...stats };
  delete next[variantKey];
  return next;
};

export const computeGlobalBestStreak = (stats: StatsByVariant): number =>
  Object.values(stats).reduce(
    (best, record) => Math.max(best, record?.bestStreak ?? 0),
    0,
  );
