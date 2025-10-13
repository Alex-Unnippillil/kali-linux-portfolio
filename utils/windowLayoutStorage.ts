import { safeLocalStorage } from './safeStorage';

export interface PersistedWindowLayout {
  workspaceId: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

export type PersistedLayoutMap = Record<string, PersistedWindowLayout>;

const STORAGE_KEY = 'shell-window-layouts';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const sanitizePosition = (value: unknown): { x: number; y: number } | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as { x?: unknown; y?: unknown };
  const x = candidate.x;
  const y = candidate.y;
  if (isFiniteNumber(x) && isFiniteNumber(y)) {
    return { x, y };
  }
  return undefined;
};

const sanitizeSize = (value: unknown): { width: number; height: number } | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as { width?: unknown; height?: unknown };
  const width = candidate.width;
  const height = candidate.height;
  if (isFiniteNumber(width) && isFiniteNumber(height)) {
    return { width, height };
  }
  return undefined;
};

const sanitizeLayout = (value: unknown): PersistedWindowLayout | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as {
    workspaceId?: unknown;
    position?: unknown;
    size?: unknown;
  };
  if (typeof candidate.workspaceId !== 'string' || candidate.workspaceId.length === 0) {
    return undefined;
  }
  const sanitized: PersistedWindowLayout = {
    workspaceId: candidate.workspaceId,
  };
  const position = sanitizePosition(candidate.position);
  if (position) {
    sanitized.position = position;
  }
  const size = sanitizeSize(candidate.size);
  if (size) {
    sanitized.size = size;
  }
  return sanitized;
};

export const loadShellWindowLayouts = (): PersistedLayoutMap => {
  if (!safeLocalStorage) return {};
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const entries = Object.entries(parsed);
    const normalized: PersistedLayoutMap = {};
    entries.forEach(([key, value]) => {
      if (typeof key !== 'string' || key.length === 0) return;
      const sanitized = sanitizeLayout(value);
      if (sanitized) {
        normalized[key] = sanitized;
      }
    });
    return normalized;
  } catch {
    return {};
  }
};

export const saveShellWindowLayouts = (layouts: PersistedLayoutMap): void => {
  if (!safeLocalStorage) return;
  try {
    const payload: PersistedLayoutMap = {};
    Object.entries(layouts).forEach(([key, value]) => {
      if (!key) return;
      const sanitized = sanitizeLayout(value);
      if (sanitized) {
        payload[key] = sanitized;
      }
    });
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage write failures (quota, private mode, etc.)
  }
};
