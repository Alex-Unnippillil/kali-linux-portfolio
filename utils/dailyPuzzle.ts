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
): T => {
  if (puzzles.length === 0) {
    throw new Error("No puzzles available");
  }
  const seed = getDailySeed(gameId, date);
  const idx = hash(seed) % puzzles.length;
  return puzzles[idx];
};

export default { getDailyPuzzle };
