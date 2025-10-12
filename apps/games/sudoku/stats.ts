export type SudokuDifficulty = 'easy' | 'medium' | 'hard';
export type SudokuMode = 'daily' | 'random';
export type SudokuBestTimes = Record<string, number>;

export const makeBestTimeKey = (
  mode: SudokuMode,
  difficulty: SudokuDifficulty,
): string => `${mode}:${difficulty}`;

export const getBestTime = (
  times: SudokuBestTimes,
  mode: SudokuMode,
  difficulty: SudokuDifficulty,
): number | undefined => times[makeBestTimeKey(mode, difficulty)];

export const recordBestTime = (
  times: SudokuBestTimes,
  mode: SudokuMode,
  difficulty: SudokuDifficulty,
  seconds: number,
): SudokuBestTimes => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return times;
  }
  const key = makeBestTimeKey(mode, difficulty);
  const current = times[key];
  if (current === undefined || seconds < current) {
    return { ...times, [key]: seconds };
  }
  return times;
};
