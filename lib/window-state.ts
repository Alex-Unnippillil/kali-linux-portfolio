import { del, get, set } from 'idb-keyval';

const STORAGE_KEY = 'desktop-state';
const MAX_WINDOWS = 32;

type UnknownWindow = {
  id?: unknown;
  x?: unknown;
  y?: unknown;
  width?: unknown;
  height?: unknown;
  zIndex?: unknown;
  minimized?: unknown;
};

export interface PersistedWindowState {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  zIndex: number;
  minimized: boolean;
}

export interface PersistedDesktopState {
  windows: PersistedWindowState[];
  dock?: string[];
  updatedAt?: number;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const sanitizeWindow = (
  windowState: UnknownWindow,
  fallbackIndex: number,
): PersistedWindowState | null => {
  const id = typeof windowState.id === 'string' ? windowState.id : '';
  if (!id) return null;
  const x = isFiniteNumber(windowState.x) ? windowState.x : 60;
  const y = isFiniteNumber(windowState.y) ? windowState.y : 10;
  const width = isFiniteNumber(windowState.width)
    ? windowState.width
    : undefined;
  const height = isFiniteNumber(windowState.height)
    ? windowState.height
    : undefined;
  const minimized = Boolean(windowState.minimized);
  const zIndex = isFiniteNumber(windowState.zIndex)
    ? windowState.zIndex
    : fallbackIndex + 1;

  return {
    id,
    x,
    y,
    width,
    height,
    minimized,
    zIndex,
  };
};

const sanitizeDock = (dock: unknown): string[] | undefined => {
  if (!Array.isArray(dock)) return undefined;
  const unique = new Set<string>();
  dock.forEach((item) => {
    if (typeof item === 'string' && item) {
      unique.add(item);
    }
  });
  return unique.size ? Array.from(unique) : undefined;
};

const normalizeWindows = (
  windows: PersistedWindowState[],
): PersistedWindowState[] => {
  const map = new Map<string, PersistedWindowState>();
  windows.forEach((win) => {
    map.set(win.id, win);
  });
  const deduped = Array.from(map.values());
  deduped.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  const limited = deduped.slice(-MAX_WINDOWS);
  return limited.map((win, index) => ({
    ...win,
    zIndex: index + 1,
  }));
};

const sanitizeState = (
  state: PersistedDesktopState | null | undefined,
): PersistedDesktopState => {
  const windowsSource: UnknownWindow[] = Array.isArray(state?.windows)
    ? (state?.windows as UnknownWindow[])
    : [];
  const sanitized = windowsSource
    .map((win, index) => sanitizeWindow(win, index))
    .filter((win): win is PersistedWindowState => Boolean(win));

  const normalized = normalizeWindows(sanitized);

  return {
    windows: normalized,
    dock: sanitizeDock(state?.dock),
    updatedAt: isFiniteNumber(state?.updatedAt)
      ? (state?.updatedAt as number)
      : Date.now(),
  };
};

const isQuotaError = (error: unknown) => {
  if (error instanceof DOMException) {
    return (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
  }
  return false;
};

export async function loadDesktopState(): Promise<PersistedDesktopState> {
  if (typeof window === 'undefined') {
    return { windows: [] };
  }
  try {
    const stored = await get<PersistedDesktopState | null>(STORAGE_KEY);
    if (!stored) {
      return { windows: [] };
    }
    return sanitizeState(stored);
  } catch (error) {
    console.error('Failed to load desktop state', error);
    return { windows: [] };
  }
}

export async function saveDesktopState(
  state: PersistedDesktopState,
): Promise<void> {
  if (typeof window === 'undefined') return;
  const sanitized = sanitizeState(state);
  try {
    await set(STORAGE_KEY, sanitized);
  } catch (error) {
    if (isQuotaError(error)) {
      const pruned = {
        ...sanitized,
        windows: sanitized.windows.slice(-Math.max(1, Math.floor(sanitized.windows.length / 2))),
      };
      try {
        await set(STORAGE_KEY, pruned);
      } catch (fallbackError) {
        console.error('Failed to persist pruned desktop state', fallbackError);
      }
    } else {
      console.error('Failed to persist desktop state', error);
    }
  }
}

export async function clearDesktopState(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await del(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear desktop state', error);
  }
}
