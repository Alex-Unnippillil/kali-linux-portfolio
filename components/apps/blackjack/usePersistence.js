import { useCallback } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

export const DEFAULT_BANKROLL = 1000;
export const BANKROLL_STORAGE_KEY = 'blackjack:bankroll';
export const HIGH_SCORE_STORAGE_KEY = 'blackjack:high';
export const MUTED_STORAGE_KEY = 'blackjack:muted';

export const isValidBankroll = (value) => Number.isInteger(value) && value >= 0;

const isBoolean = (value) => typeof value === 'boolean';

export default function useBlackjackPersistence() {
  const [bankroll, setBankroll, resetBankroll] = usePersistentState(
    BANKROLL_STORAGE_KEY,
    DEFAULT_BANKROLL,
    isValidBankroll,
  );
  const [highScore, setHighScore] = usePersistentState(
    HIGH_SCORE_STORAGE_KEY,
    DEFAULT_BANKROLL,
    isValidBankroll,
  );
  const [muted, setMuted] = usePersistentState(MUTED_STORAGE_KEY, false, isBoolean);

  const recordHighScore = useCallback(
    (value) => {
      let nextValue = value;
      setHighScore((prev) => {
        nextValue = value > prev ? value : prev;
        return nextValue;
      });
      return nextValue;
    },
    [setHighScore],
  );

  const resetProgress = useCallback(() => {
    resetBankroll();
    setHighScore(DEFAULT_BANKROLL);
  }, [resetBankroll, setHighScore]);

  return {
    bankroll,
    setBankroll,
    highScore,
    recordHighScore,
    resetProgress,
    muted,
    setMuted,
  };
}
