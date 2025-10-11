import { recordScore } from '../../components/apps/Games/common/leaderboard';

export type MatchResult = 'win' | 'loss' | 'draw';

export interface MatchRecord {
  result: MatchResult;
  finalElo: number;
  moves: number;
  timestamp: number;
  pgn: string;
}

const HISTORY_KEY = 'chess:history';
const BEST_KEY = 'chess:bestElo';
export const MAX_HISTORY = 20;

const isBrowser = () => typeof window !== 'undefined' && !!window.localStorage;

const readJson = <T>(key: string, fallback: T): T => {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore storage errors */
  }
};

export const loadHistory = (): MatchRecord[] => readJson(HISTORY_KEY, []);

export const saveHistory = (records: MatchRecord[]): void =>
  writeJson(HISTORY_KEY, records.slice(0, MAX_HISTORY));

export const loadBestElo = (): number => readJson(BEST_KEY, 0);

export const saveBestElo = (elo: number): void => writeJson(BEST_KEY, elo);

export const clearHistory = (): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(HISTORY_KEY);
    window.localStorage.removeItem(BEST_KEY);
  } catch {
    /* ignore */
  }
};

interface RecordParams {
  result: MatchResult;
  finalElo: number;
  moves: number;
  pgn: string;
  timestamp?: number;
}

export const recordMatch = ({
  result,
  finalElo,
  moves,
  pgn,
  timestamp = Date.now(),
}: RecordParams) => {
  const next: MatchRecord = { result, finalElo, moves, pgn, timestamp };
  const history = [next, ...loadHistory()]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_HISTORY);
  saveHistory(history);
  const bestElo = Math.max(loadBestElo(), finalElo);
  saveBestElo(bestElo);
  if (isBrowser()) {
    try {
      recordScore('chess', 'You', finalElo);
    } catch {
      /* ignore leaderboard errors */
    }
  }
  return { history, bestElo };
};
