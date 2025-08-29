export interface LeaderboardEntry {
  name: string;
  score: number;
}

const LEADERBOARD_PREFIX = 'leaderboard:';
const SEED_PREFIX = 'dailySeed:';
const MAX_SCORE = 1_000_000_000;

const isValidScore = (score: number): boolean =>
  typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= MAX_SCORE;

const validateBoard = (value: unknown): value is LeaderboardEntry[] =>
  Array.isArray(value) && value.every((e) =>
    typeof e === 'object' &&
    e !== null &&
    typeof (e as any).name === 'string' &&
    isValidScore((e as any).score));

export const getLeaderboard = (gameId: string): LeaderboardEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${LEADERBOARD_PREFIX}${gameId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (validateBoard(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
};

export const recordScore = (
  gameId: string,
  name: string,
  score: number,
  limit = 10,
): LeaderboardEntry[] => {
  if (!isValidScore(score)) return getLeaderboard(gameId);
  const board = getLeaderboard(gameId);
  board.push({ name, score });
  board.sort((a, b) => b.score - a.score);
  const trimmed = board.slice(0, limit);
  try {
    window.localStorage.setItem(
      `${LEADERBOARD_PREFIX}${gameId}`,
      JSON.stringify(trimmed),
    );
  } catch {
    /* ignore storage errors */
  }
  return trimmed;
};

// Simple deterministic hash for string
const hash = (str: string): string => {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
};

export const getDailySeed = (gameId: string, date: Date = new Date()): string => {
  const day = date.toISOString().split('T')[0];
  const key = `${gameId}:${day}`;
  const seed = hash(key);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`${SEED_PREFIX}${gameId}`, seed);
    } catch {
      /* ignore storage errors */
    }
  }
  return seed;
};

import { useCallback } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

export const useLeaderboard = (gameId: string, limit = 10) => {
  const key = `${LEADERBOARD_PREFIX}${gameId}`;
  const [board, setBoard] = usePersistentState<LeaderboardEntry[]>(key, [], validateBoard);

  const addScore = useCallback(
    (name: string, score: number) => {
      if (!isValidScore(score)) return;
      const next = [...board, { name, score }]
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      setBoard(next);
    },
    [board, limit, setBoard],
  );

  return { leaderboard: board, recordScore: addScore };
};

export default useLeaderboard;
