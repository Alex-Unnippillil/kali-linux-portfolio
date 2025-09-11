import {
  LeaderboardEntry,
  getLeaderboard,
  recordScore as baseRecordScore,
} from '../components/apps/Games/common/leaderboard';
import { broadcastLeaderboard } from './sync';

const SEED_PREFIX = 'dailySeed:';
const COMPLETE_PREFIX = 'dailyComplete:';

// Simple deterministic hash for string
const hash = (str: string): string => {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
};

// Generate a daily seed based on UTC date so all devices share the same seed
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

export { getLeaderboard };

export const hasCompleted = (
  gameId: string,
  date: Date = new Date(),
): boolean => {
  if (typeof window === 'undefined') return false;
  const day = date.toISOString().split('T')[0];
  try {
    return window.localStorage.getItem(
      `${COMPLETE_PREFIX}${gameId}:${day}`
    ) === '1';
  } catch {
    return false;
  }
};

export const recordCompletion = (
  gameId: string,
  name: string,
  score: number,
  date: Date = new Date(),
  limit = 10,
): LeaderboardEntry[] => {
  const board = baseRecordScore(gameId, name, score, limit);
  if (typeof window !== 'undefined') {
    try {
      const day = date.toISOString().split('T')[0];
      window.localStorage.setItem(
        `${COMPLETE_PREFIX}${gameId}:${day}`,
        '1',
      );
    } catch {
      /* ignore storage errors */
    }
  }
  broadcastLeaderboard(board);
  return board;
};

export type { LeaderboardEntry };
