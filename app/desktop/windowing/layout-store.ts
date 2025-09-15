import { safeLocalStorage } from '@/utils/safeStorage';

export interface WindowLayoutSnapshot {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export type LayoutState = Record<string, WindowLayoutSnapshot>;

const STORAGE_KEY = 'kali:layout:v1';

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function loadLayout(): LayoutState {
  if (!safeLocalStorage) {
    return {};
  }

  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    const layout: LayoutState = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (!value || typeof value !== 'object') {
        continue;
      }
      const maybeX = (value as Record<string, unknown>).x;
      const maybeY = (value as Record<string, unknown>).y;
      if (!isNumber(maybeX) || !isNumber(maybeY)) {
        continue;
      }
      const snapshot: WindowLayoutSnapshot = { x: maybeX, y: maybeY };
      const maybeWidth = (value as Record<string, unknown>).width;
      const maybeHeight = (value as Record<string, unknown>).height;
      if (isNumber(maybeWidth)) {
        snapshot.width = maybeWidth;
      }
      if (isNumber(maybeHeight)) {
        snapshot.height = maybeHeight;
      }
      layout[id] = snapshot;
    }

    return layout;
  } catch (error) {
    return {};
  }
}

export function saveLayout(layout: LayoutState): void {
  if (!safeLocalStorage) {
    return;
  }

  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch (error) {
    // Ignore quota or serialization issues
  }
}
