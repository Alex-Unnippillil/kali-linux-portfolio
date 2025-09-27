import { safeLocalStorage } from './safeStorage';

export const WINDOW_LAYOUT_STORAGE_KEY = 'desktop-window-layout';
export const WINDOW_LAYOUT_VERSION = 1;

export interface WindowLayoutPosition {
  x: number;
  y: number;
}

export interface WindowLayoutSize {
  width: number;
  height: number;
}

export interface StoredWindowLayoutEntry {
  id: string;
  workspace: number;
  position: WindowLayoutPosition;
  size: WindowLayoutSize;
  zIndex: number;
  minimized: boolean;
  focused: boolean;
}

export interface StoredWindowLayout {
  version: number;
  activeWorkspace: number;
  windows: StoredWindowLayoutEntry[];
}

function clampWorkspace(workspace: number): number {
  if (Number.isFinite(workspace)) {
    if (workspace < 0) return 0;
    if (!Number.isNaN(workspace)) return Math.floor(workspace);
  }
  return 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function sanitizeEntry(entry: unknown): StoredWindowLayoutEntry | null {
  if (!entry || typeof entry !== 'object') return null;
  const source = entry as Partial<StoredWindowLayoutEntry> & {
    position?: Partial<WindowLayoutPosition>;
    size?: Partial<WindowLayoutSize>;
  };

  if (typeof source.id !== 'string' || source.id.length === 0) return null;

  const position = source.position || (entry as any).position;
  const size = source.size || (entry as any).size;

  if (!position || typeof position !== 'object') return null;
  if (!size || typeof size !== 'object') return null;

  const posX = (position as any).x;
  const posY = (position as any).y;
  const width = (size as any).width;
  const height = (size as any).height;

  if (!isFiniteNumber(posX) || !isFiniteNumber(posY)) return null;
  if (!isFiniteNumber(width) || !isFiniteNumber(height)) return null;

  const zIndex = isFiniteNumber(source.zIndex) ? source.zIndex : 0;
  const minimized = typeof source.minimized === 'boolean' ? source.minimized : Boolean((entry as any).minimized);
  const focused = typeof source.focused === 'boolean' ? source.focused : Boolean((entry as any).focused);
  const workspace = clampWorkspace((entry as any).workspace ?? 0);

  return {
    id: source.id,
    workspace,
    position: { x: posX, y: posY },
    size: { width, height },
    zIndex,
    minimized,
    focused,
  };
}

export function sanitizeWindowLayout(raw: unknown): StoredWindowLayout | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Partial<StoredWindowLayout> & { windows?: unknown };

  if (source.version !== WINDOW_LAYOUT_VERSION) {
    return null;
  }

  const activeWorkspace = clampWorkspace((source as any).activeWorkspace ?? 0);

  if (!Array.isArray(source.windows)) {
    return null;
  }

  const windows = source.windows
    .map(sanitizeEntry)
    .filter((entry): entry is StoredWindowLayoutEntry => Boolean(entry));

  if (windows.length === 0) {
    return null;
  }

  return {
    version: WINDOW_LAYOUT_VERSION,
    activeWorkspace,
    windows,
  };
}

export function readWindowLayout(): StoredWindowLayout | null {
  if (!safeLocalStorage) return null;
  const raw = safeLocalStorage.getItem(WINDOW_LAYOUT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const layout = sanitizeWindowLayout(parsed);
    if (!layout) {
      safeLocalStorage.removeItem(WINDOW_LAYOUT_STORAGE_KEY);
      return null;
    }
    return layout;
  } catch {
    safeLocalStorage.removeItem(WINDOW_LAYOUT_STORAGE_KEY);
    return null;
  }
}

export function writeWindowLayout(layout: StoredWindowLayout): void {
  if (!safeLocalStorage) return;
  const sanitized = sanitizeWindowLayout(layout);
  if (!sanitized) {
    safeLocalStorage.removeItem(WINDOW_LAYOUT_STORAGE_KEY);
    return;
  }
  try {
    safeLocalStorage.setItem(
      WINDOW_LAYOUT_STORAGE_KEY,
      JSON.stringify(sanitized),
    );
  } catch {
    // ignore write errors (e.g., quota exceeded)
  }
}

export function clearWindowLayout(): void {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.removeItem(WINDOW_LAYOUT_STORAGE_KEY);
  } catch {
    // ignore removal errors
  }
}
