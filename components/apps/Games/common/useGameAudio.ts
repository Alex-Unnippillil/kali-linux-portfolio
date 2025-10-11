import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface GameAudioOptions {
  /** Persisted key prefix override. Defaults to `game:audio:`. */
  keyPrefix?: string;
  /** Provide alternate storage implementation for tests. */
  storage?: StorageLike;
  /** Initial muted state when storage has no value. */
  initialMuted?: boolean;
}

export interface ToneOptions {
  frequency?: number;
  duration?: number;
  volume?: number;
  type?: OscillatorType;
}

const DEFAULT_PREFIX = 'game:audio:';

const getStorage = (options: GameAudioOptions): StorageLike | null => {
  if (options.storage) return options.storage;
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const getKey = (gameId: string, prefix: string) => `${prefix}${gameId}`;

export const loadMuted = (gameId: string, options: GameAudioOptions = {}): boolean => {
  const storage = getStorage(options);
  const prefix = options.keyPrefix ?? DEFAULT_PREFIX;
  const fallback = options.initialMuted ?? false;
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(getKey(gameId, prefix));
    if (raw === null) return fallback;
    return raw === '1' || raw === 'true';
  } catch {
    return fallback;
  }
};

export const saveMuted = (gameId: string, muted: boolean, options: GameAudioOptions = {}): void => {
  const storage = getStorage(options);
  if (!storage) return;
  const prefix = options.keyPrefix ?? DEFAULT_PREFIX;
  try {
    storage.setItem(getKey(gameId, prefix), muted ? '1' : '0');
  } catch {
    /* ignore storage errors */
  }
};

const useGameAudio = (gameId: string, options: GameAudioOptions = {}) => {
  const { initialMuted = false } = options;
  const storageMemo = useMemo(
    () => ({ ...options, initialMuted }),
    [options.keyPrefix, options.storage, initialMuted],
  );
  const [muted, setMutedState] = useState(() => loadMuted(gameId, storageMemo));
  const audioCtx = useRef<AudioContext | null>(null);

  useEffect(() => {
    setMutedState(loadMuted(gameId, storageMemo));
  }, [gameId, storageMemo]);

  const setMuted = useCallback(
    (value: boolean) => {
      setMutedState(value);
      saveMuted(gameId, value, storageMemo);
    },
    [gameId, storageMemo],
  );

  const toggleMuted = useCallback(() => {
    setMutedState((prev) => {
      const next = !prev;
      saveMuted(gameId, next, storageMemo);
      return next;
    });
  }, [gameId, storageMemo]);

  const playTone = useCallback(
    ({ frequency = 440, duration = 0.1, volume = 0.1, type = 'sine' }: ToneOptions = {}) => {
      if (muted || typeof window === 'undefined') return;
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      if (!audioCtx.current) {
        try {
          audioCtx.current = new AudioCtor();
        } catch {
          return;
        }
      }
      const ctx = audioCtx.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.start(now);
      osc.stop(now + duration);
    },
    [muted],
  );

  return { muted, setMuted, toggleMuted, playTone };
};

export default useGameAudio;
