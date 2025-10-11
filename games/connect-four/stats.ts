export const STATS_STORAGE_KEY = 'connect-four:stats';

export type ConnectFourStats = {
  playerWins: number;
  cpuWins: number;
  draws: number;
};

export type GameOutcome = 'player' | 'cpu' | 'draw';

export const DEFAULT_STATS: ConnectFourStats = {
  playerWins: 0,
  cpuWins: 0,
  draws: 0,
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const resolveStorage = (storage?: StorageLike): StorageLike | undefined => {
  if (storage) return storage;
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

export const loadStats = (
  storage?: StorageLike,
): ConnectFourStats => {
  const store = resolveStorage(storage);
  if (!store) return { ...DEFAULT_STATS };
  try {
    const raw = store.getItem(STATS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.playerWins === 'number' &&
      typeof parsed.cpuWins === 'number' &&
      typeof parsed.draws === 'number'
    ) {
      return {
        playerWins: Math.max(0, parsed.playerWins | 0),
        cpuWins: Math.max(0, parsed.cpuWins | 0),
        draws: Math.max(0, parsed.draws | 0),
      };
    }
  } catch {
    /* ignore malformed data */
  }
  return { ...DEFAULT_STATS };
};

export const saveStats = (
  stats: ConnectFourStats,
  storage?: StorageLike,
): void => {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    /* ignore write errors */
  }
};

export const clearStats = (storage?: StorageLike): void => {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.removeItem(STATS_STORAGE_KEY);
  } catch {
    /* ignore remove errors */
  }
};

export const recordOutcome = (
  stats: ConnectFourStats,
  outcome: GameOutcome,
): ConnectFourStats => {
  const next: ConnectFourStats = {
    playerWins: stats.playerWins,
    cpuWins: stats.cpuWins,
    draws: stats.draws,
  };
  if (outcome === 'player') next.playerWins += 1;
  else if (outcome === 'cpu') next.cpuWins += 1;
  else next.draws += 1;
  return next;
};
