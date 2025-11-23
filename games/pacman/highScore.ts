import { useCallback } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

const KEY = 'pacman_highscore';

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const usePacmanHighScore = () => {
  const [highScore, setHighScore, resetHighScore, clearHighScore] =
    usePersistentState(KEY, 0, isNumber);

  const recordScore = useCallback(
    (score: number) => {
      setHighScore((prev) => (score > prev ? score : prev));
    },
    [setHighScore],
  );

  return {
    highScore,
    recordScore,
    resetHighScore,
    clearHighScore,
  } as const;
};
