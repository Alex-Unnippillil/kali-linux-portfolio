import { useSyncExternalStore } from 'react';
import { safeLocalStorage } from '../utils/safeStorage';

export type SnapPosition =
  | 'left'
  | 'right'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'fullscreen';

const SNAP_POSITION_ALIASES: Record<string, SnapPosition> = {
  top: 'fullscreen',
};

function normalizeSnapPosition(value: unknown): SnapPosition | null {
  if (typeof value !== 'string') return null;
  if (value in SNAP_POSITION_ALIASES) {
    return SNAP_POSITION_ALIASES[value];
  }
  if (
    value === 'left' ||
    value === 'right' ||
    value === 'bottom' ||
    value === 'top-left' ||
    value === 'top-right' ||
    value === 'bottom-left' ||
    value === 'bottom-right' ||
    value === 'fullscreen'
  ) {
    return value;
  }
  return null;
}

export interface WindowGeometry {
  width: number;
  height: number;
}

export interface WindowLayoutSnapshot {
  snapped: SnapPosition | null;
  originalSize: WindowGeometry | null;
}

interface ShellState {
  windowLayouts: Record<string, WindowLayoutSnapshot>;
}

type Listener = () => void;

type StateUpdater = (state: ShellState) => ShellState;

type PartialState = Partial<ShellState> | StateUpdater;

const STORAGE_KEY = 'v1:shell:window-layouts';

const fallbackState: ShellState = {
  windowLayouts: {},
};

function readFromStorage(): ShellState {
  const storage = safeLocalStorage;
  if (!storage) {
    return fallbackState;
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return fallbackState;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallbackState;
    const windowLayouts: Record<string, WindowLayoutSnapshot> = {};
    Object.entries(parsed.windowLayouts || {}).forEach(([id, value]) => {
      if (!id || !value || typeof value !== 'object') return;
      const snapshot = value as Partial<WindowLayoutSnapshot>;
      const snapped = normalizeSnapPosition(snapshot.snapped);
      const size = snapshot.originalSize;
      const width = size && typeof size.width === 'number' ? size.width : null;
      const height = size && typeof size.height === 'number' ? size.height : null;
      windowLayouts[id] = {
        snapped,
        originalSize: width !== null && height !== null ? { width, height } : null,
      };
    });
    return { windowLayouts };
  } catch (error) {
    return fallbackState;
  }
}

let currentState: ShellState = readFromStorage();
const listeners = new Set<Listener>();

function persistState(state: ShellState) {
  const storage = safeLocalStorage;
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // ignore quota errors
  }
}

function setState(update: PartialState) {
  const nextState =
    typeof update === 'function' ? (update as StateUpdater)(currentState) : { ...currentState, ...update };
  currentState = nextState;
  persistState(currentState);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return currentState;
}

function getServerSnapshot() {
  return fallbackState;
}

export function useShellStore<T>(selector: (state: ShellState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getSnapshot()), () => selector(getServerSnapshot()));
}

export const shellStore = {
  getState: () => currentState,
  setState,
  subscribe,
  setWindowLayout(id: string, layout: WindowLayoutSnapshot | null) {
    if (!id) return;
    setState((state) => {
      const nextLayouts = { ...state.windowLayouts };
      if (!layout) {
        delete nextLayouts[id];
      } else {
        const originalSize = layout.originalSize;
        const width = originalSize && typeof originalSize.width === 'number' ? originalSize.width : null;
        const height = originalSize && typeof originalSize.height === 'number' ? originalSize.height : null;
        const sanitized: WindowLayoutSnapshot = {
          snapped: normalizeSnapPosition(layout.snapped) ?? null,
          originalSize: width !== null && height !== null ? { width, height } : null,
        };
        nextLayouts[id] = sanitized;
      }
      return { windowLayouts: nextLayouts };
    });
  },
  getWindowLayout(id: string): WindowLayoutSnapshot | null {
    if (!id) return null;
    const layout = currentState.windowLayouts[id];
    return layout ? { ...layout } : null;
  },
};

export default useShellStore;
