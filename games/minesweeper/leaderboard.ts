export type MinesweeperDifficulty = 'beginner' | 'intermediate' | 'expert';

export interface MinesweeperLeaderboardEntry {
  name: string;
  time: number;
  createdAt: number;
}

export type MinesweeperLeaderboards = Record<
  MinesweeperDifficulty,
  MinesweeperLeaderboardEntry[]
>;

export const LEADERBOARD_LIMIT = 5;

export const DIFFICULTY_IDS: MinesweeperDifficulty[] = [
  'beginner',
  'intermediate',
  'expert',
];

const STORAGE_KEY = 'minesweeper:leaderboards';

const clampName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return 'Anonymous';
  return trimmed.slice(0, 40);
};

export const createEmptyLeaderboards = (): MinesweeperLeaderboards => ({
  beginner: [],
  intermediate: [],
  expert: [],
});

const isFiniteTime = (time: number): boolean =>
  typeof time === 'number' && Number.isFinite(time) && time > 0;

const parseLeaderboards = (raw: unknown): MinesweeperLeaderboards => {
  const fallback = createEmptyLeaderboards();
  if (!raw || typeof raw !== 'object') return fallback;
  const data = raw as Record<string, unknown>;
  const result: MinesweeperLeaderboards = createEmptyLeaderboards();

  for (const difficulty of DIFFICULTY_IDS) {
    const list = data[difficulty];
    if (!Array.isArray(list)) continue;
    const entries: MinesweeperLeaderboardEntry[] = [];
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as Partial<MinesweeperLeaderboardEntry>;
      if (!isFiniteTime(entry.time ?? NaN)) continue;
      const createdAt =
        typeof entry.createdAt === 'number' && Number.isFinite(entry.createdAt)
          ? entry.createdAt
          : Date.now();
      const name =
        typeof entry.name === 'string' ? clampName(entry.name) : 'Anonymous';
      entries.push({ name, time: entry.time as number, createdAt });
    }
    entries.sort(
      (a, b) => a.time - b.time || a.createdAt - b.createdAt,
    );
    result[difficulty] = entries.slice(0, LEADERBOARD_LIMIT);
  }

  return result;
};

const readStorage = (): MinesweeperLeaderboards => {
  if (typeof window === 'undefined') {
    return createEmptyLeaderboards();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyLeaderboards();
    return parseLeaderboards(JSON.parse(raw));
  } catch {
    return createEmptyLeaderboards();
  }
};

const writeStorage = (data: MinesweeperLeaderboards): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore storage errors */
  }
};

export const loadLeaderboards = (): MinesweeperLeaderboards => readStorage();

export const getLeaderboard = (
  difficulty: MinesweeperDifficulty,
): MinesweeperLeaderboardEntry[] => readStorage()[difficulty] ?? [];

export const shouldRecordTime = (
  entries: MinesweeperLeaderboardEntry[],
  time: number,
  limit: number = LEADERBOARD_LIMIT,
): boolean => {
  if (!isFiniteTime(time)) return false;
  if (entries.length < limit) return true;
  const worst = entries[entries.length - 1];
  return time < worst.time;
};

export const recordTime = (
  difficulty: MinesweeperDifficulty,
  name: string,
  time: number,
  limit: number = LEADERBOARD_LIMIT,
): MinesweeperLeaderboardEntry[] => {
  if (!isFiniteTime(time)) return getLeaderboard(difficulty);
  const leaderboards = readStorage();
  const entries = leaderboards[difficulty]
    ? [...leaderboards[difficulty]]
    : [];
  entries.push({ name: clampName(name), time, createdAt: Date.now() });
  entries.sort((a, b) => a.time - b.time || a.createdAt - b.createdAt);
  leaderboards[difficulty] = entries.slice(0, limit);
  writeStorage(leaderboards);
  return leaderboards[difficulty];
};

export const qualifiesForLeaderboard = (
  difficulty: MinesweeperDifficulty,
  time: number,
  limit: number = LEADERBOARD_LIMIT,
): boolean => {
  const entries = getLeaderboard(difficulty);
  return shouldRecordTime(entries, time, limit);
};

export const clearLeaderboard = (
  difficulty: MinesweeperDifficulty,
): void => {
  const leaderboards = readStorage();
  leaderboards[difficulty] = [];
  writeStorage(leaderboards);
};

