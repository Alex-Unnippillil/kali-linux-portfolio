import { getDailySeed } from "./dailyChallenge";

const hash = (str: string): number => {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
};

export const getDailyPuzzle = <T>(
  gameId: string,
  puzzles: T[],
  date: Date = new Date(),
  defaultPuzzle: T | null = null,
): T | null => {
  if (puzzles.length === 0) {
    return defaultPuzzle;
  }
  const seed = getDailySeed(gameId, date);
    const idx = hash(seed) % puzzles.length;
    return puzzles[idx] ?? defaultPuzzle;
  };

const dailyPuzzle = { getDailyPuzzle };

export default dailyPuzzle;
