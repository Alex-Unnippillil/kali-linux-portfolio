export interface LeaderboardEntry {
  name: string;
  score: number;
}

const PREFIX = 'leaderboard:';
const MAX_SCORE = 1_000_000_000;

const isValidScore = (score: number): boolean =>
  typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= MAX_SCORE;

export const getLeaderboard = (gameId: string): LeaderboardEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${gameId}`);
    if (!raw) return [];
    return JSON.parse(raw) as LeaderboardEntry[];
  } catch {
    return [];
  }
};

export const recordScore = (
  gameId: string,
  name: string,
  score: number,
  limit = 10
): LeaderboardEntry[] => {
  if (!isValidScore(score)) return getLeaderboard(gameId);
  const board = getLeaderboard(gameId);
  board.push({ name, score });
  board.sort((a, b) => b.score - a.score);
  const trimmed = board.slice(0, limit);
  try {
    window.localStorage.setItem(`${PREFIX}${gameId}`, JSON.stringify(trimmed));
  } catch {
    /* ignore storage errors */
  }
  return trimmed;
};

