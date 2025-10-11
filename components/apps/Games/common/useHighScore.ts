import { useCallback, useEffect, useMemo, useState } from 'react';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface HighScoreOptions {
  /** Fallback score returned when storage is unavailable. */
  initial?: number;
  /** Optional storage implementation (defaults to `window.localStorage`). */
  storage?: StorageLike;
  /** Legacy storage keys that should be migrated on first read. */
  legacyKeys?: string[];
}

const KEY_PREFIX = 'game:highscore:';
const MAX_SCORE = 1_000_000_000;

const getStorage = (options: HighScoreOptions): StorageLike | null => {
  if (options.storage) return options.storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const parseScore = (value: string | null): number | null => {
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_SCORE) return null;
  return parsed;
};

const getKey = (gameId: string) => `${KEY_PREFIX}${gameId}`;

const migrateLegacy = (gameId: string, options: HighScoreOptions): number | null => {
  const storage = getStorage(options);
  if (!storage) return null;
  const legacyKeys = options.legacyKeys ?? [];
  for (const key of legacyKeys) {
    try {
      const value = parseScore(storage.getItem(key));
      if (value !== null) {
        storage.setItem(getKey(gameId), String(value));
        return value;
      }
    } catch {
      /* ignore storage errors */
    }
  }
  return null;
};

export const loadHighScore = (
  gameId: string,
  options: HighScoreOptions = {},
): number => {
  const storage = getStorage(options);
  const fallback = options.initial ?? 0;
  const key = getKey(gameId);
  if (!storage) return fallback;
  try {
    const existing = parseScore(storage.getItem(key));
    if (existing !== null) return existing;
  } catch {
    /* ignore */
  }
  const migrated = migrateLegacy(gameId, options);
  if (migrated !== null) return migrated;
  return fallback;
};

export const recordHighScore = (
  gameId: string,
  score: number,
  options: HighScoreOptions = {},
): number => {
  if (!Number.isFinite(score) || score < 0) return loadHighScore(gameId, options);
  const storage = getStorage(options);
  const current = loadHighScore(gameId, options);
  const next = Math.min(MAX_SCORE, Math.max(current, Math.floor(score)));
  if (!storage) return next;
  try {
    storage.setItem(getKey(gameId), String(next));
  } catch {
    /* ignore */
  }
  return next;
};

export const clearHighScore = (gameId: string, options: HighScoreOptions = {}): void => {
  const storage = getStorage(options);
  if (!storage) return;
  try {
    storage.removeItem(getKey(gameId));
  } catch {
    /* ignore */
  }
};

const legacySignature = (legacyKeys: string[]): string => legacyKeys.join('|');

interface NormalizedOptions {
  initial: number;
  storage?: StorageLike;
  legacyKeys: string[];
}

const buildOptions = (options: HighScoreOptions): NormalizedOptions => {
  const { initial = 0, storage, legacyKeys = [] } = options;
  return { initial, storage, legacyKeys };
};

const useHighScore = (gameId: string, options: HighScoreOptions = {}) => {
  const base = buildOptions(options);
  const { initial, storage, legacyKeys } = base;
  const legacyMemo = useMemo(() => legacySignature(legacyKeys), [legacyKeys]);
  const memoOptions = useMemo(
    () => ({ initial, storage, legacyKeys }),
    [initial, storage, legacyMemo],
  );
  const [highScore, setHighScore] = useState(() => loadHighScore(gameId, memoOptions));

  useEffect(() => {
    setHighScore(loadHighScore(gameId, memoOptions));
  }, [gameId, memoOptions]);

  const recordScore = useCallback(
    (score: number) => {
      const value = recordHighScore(gameId, score, memoOptions);
      setHighScore(value);
      return value;
    },
    [gameId, memoOptions],
  );

  const resetHighScore = useCallback(() => {
    clearHighScore(gameId, memoOptions);
    setHighScore(initial);
  }, [gameId, memoOptions, initial]);

  return { highScore, recordScore, resetHighScore };
};

export default useHighScore;
