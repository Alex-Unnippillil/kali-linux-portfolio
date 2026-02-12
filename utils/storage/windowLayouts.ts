import { safeLocalStorage } from '../safeStorage';

export const WINDOW_LAYOUT_STORAGE_KEY = 'desktop:window-layouts';

export type LayoutPresetName =
  | 'split-50-50'
  | 'thirds'
  | 'seventy-thirty'
  | 'grid-2x2'
  | 'main-plus-side';

export const LAYOUT_PRESETS: LayoutPresetName[] = [
  'split-50-50',
  'thirds',
  'seventy-thirty',
  'grid-2x2',
  'main-plus-side',
];

export const LAYOUT_PRESET_LABELS: Record<LayoutPresetName, string> = {
  'split-50-50': '50/50 Split',
  thirds: 'Thirds',
  'seventy-thirty': '70/30 Split',
  'grid-2x2': '2x2 Grid',
  'main-plus-side': 'Main with Side Rail',
};

export interface StoredRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StoredWindowAssignment {
  preset: LayoutPresetName;
  slot: number;
}

export interface StoredWindowLayout {
  preset: LayoutPresetName | null;
  order: string[];
  positions: Record<string, StoredRect>;
  assignments: Record<string, StoredWindowAssignment>;
  updatedAt: number;
}

export type StoredWindowLayouts = Record<string, StoredWindowLayout>;

export interface WindowLayoutRepository {
  load(displayId: string): StoredWindowLayout | undefined;
  save(displayId: string, layout: StoredWindowLayout): void;
  clear(displayId: string): void;
  all(): StoredWindowLayouts;
}

const readState = (storage: Storage | undefined): StoredWindowLayouts => {
  if (!storage) return {};
  try {
    const raw = storage.getItem(WINDOW_LAYOUT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredWindowLayouts;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
};

const writeState = (
  storage: Storage | undefined,
  state: StoredWindowLayouts
): void => {
  if (!storage) return;
  try {
    storage.setItem(WINDOW_LAYOUT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors (quota, privacy settings, etc.)
  }
};

export const createWindowLayoutRepository = (
  storage: Storage | undefined = safeLocalStorage
): WindowLayoutRepository => {
  return {
    load(displayId) {
      const state = readState(storage);
      return state[displayId];
    },
    save(displayId, layout) {
      const state = readState(storage);
      state[displayId] = layout;
      writeState(storage, state);
    },
    clear(displayId) {
      const state = readState(storage);
      if (displayId in state) {
        delete state[displayId];
        writeState(storage, state);
      }
    },
    all() {
      const state = readState(storage);
      return { ...state };
    },
  };
};

export const createMemoryWindowLayoutRepository = (
  initial: StoredWindowLayouts = {}
): WindowLayoutRepository => {
  let state: StoredWindowLayouts = { ...initial };
  return {
    load(displayId) {
      return state[displayId];
    },
    save(displayId, layout) {
      state = { ...state, [displayId]: { ...layout } };
    },
    clear(displayId) {
      if (!(displayId in state)) return;
      const { [displayId]: _removed, ...rest } = state;
      state = rest;
    },
    all() {
      return { ...state };
    },
  };
};

export const windowLayoutRepository = createWindowLayoutRepository();
