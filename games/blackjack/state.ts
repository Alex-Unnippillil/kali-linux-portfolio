import usePersistentState from '../../hooks/usePersistentState';

export const useBestStreak = () =>
  usePersistentState<number>('bj_best_streak', 0, (v): v is number => typeof v === 'number');

export type BestStreakState = ReturnType<typeof useBestStreak>;
