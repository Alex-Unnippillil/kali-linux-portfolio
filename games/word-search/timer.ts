import type { TimerMode } from './config';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export const TIMER_STORAGE_KEY = 'game:word_search:timer';

export interface TimerDefaults {
  readonly initialValue: number;
  readonly mode: TimerMode;
  readonly limit?: number | null;
}

export interface TimerSnapshot {
  readonly value: number;
  readonly paused: boolean;
}

export interface PersistedTimerState extends TimerSnapshot {
  readonly seed: string;
  readonly difficulty: string;
  readonly mode: TimerMode;
  readonly limit?: number | null;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const loadTimerState = (
  storage: StorageLike | undefined,
  seed: string,
  difficulty: string,
  defaults: TimerDefaults,
): TimerSnapshot => {
  if (!storage) {
    return { value: defaults.initialValue, paused: false };
  }
  try {
    const raw = storage.getItem(TIMER_STORAGE_KEY);
    if (!raw) {
      return { value: defaults.initialValue, paused: false };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedTimerState>;
    if (!parsed || parsed.seed !== seed || parsed.difficulty !== difficulty) {
      return { value: defaults.initialValue, paused: false };
    }
    if (parsed.mode && parsed.mode !== defaults.mode) {
      return { value: defaults.initialValue, paused: false };
    }
    const limit = defaults.mode === 'countdown' ? defaults.limit ?? defaults.initialValue : undefined;
    const safeValue = typeof parsed.value === 'number' && Number.isFinite(parsed.value)
      ? parsed.value
      : defaults.initialValue;
    const value = limit != null ? clamp(safeValue, 0, limit) : Math.max(0, safeValue);
    const paused = typeof parsed.paused === 'boolean' ? parsed.paused : false;
    return { value, paused };
  } catch {
    return { value: defaults.initialValue, paused: false };
  }
};

export const persistTimerState = (
  storage: StorageLike | undefined,
  state: PersistedTimerState,
): void => {
  if (!storage) return;
  try {
    const payload = JSON.stringify({
      seed: state.seed,
      difficulty: state.difficulty,
      mode: state.mode,
      value: state.value,
      paused: state.paused,
      limit: state.limit ?? null,
    });
    storage.setItem(TIMER_STORAGE_KEY, payload);
  } catch {
    // ignore storage write errors
  }
};

export const clearTimerState = (storage: StorageLike | undefined): void => {
  if (!storage) return;
  try {
    if (typeof storage.removeItem === 'function') {
      storage.removeItem(TIMER_STORAGE_KEY);
    } else {
      storage.setItem(TIMER_STORAGE_KEY, '');
    }
  } catch {
    // ignore storage errors
  }
};

export const formatTime = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (safe % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export const computeElapsed = (
  mode: TimerMode,
  value: number,
  limit?: number | null,
): number => {
  if (mode === 'countdown') {
    const safeLimit = limit ?? 0;
    return Math.max(0, safeLimit - value);
  }
  return Math.max(0, value);
};

