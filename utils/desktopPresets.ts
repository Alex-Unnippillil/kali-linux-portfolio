import { safeLocalStorage } from './safeStorage';

export interface DesktopLayoutVector {
  x: number;
  y: number;
}

export interface DesktopLayoutSize {
  width: number;
  height: number;
}

export interface DesktopLayoutWorkspaceState {
  id: number;
  label?: string;
  focused_windows: Record<string, boolean>;
  closed_windows: Record<string, boolean>;
  minimized_windows: Record<string, boolean>;
  window_positions: Record<string, DesktopLayoutVector>;
  window_sizes: Record<string, DesktopLayoutSize>;
}

export interface DesktopLayoutSnapshot {
  version: number;
  capturedAt: number;
  viewport?: {
    width: number | null;
    height: number | null;
  };
  desktopApps: string[];
  desktopIconPositions: Record<string, DesktopLayoutVector>;
  iconSizePreset?: string;
  workspaces: DesktopLayoutWorkspaceState[];
}

export interface DesktopLayoutPreset {
  id: string;
  name: string;
  createdAt: number;
  layout: DesktopLayoutSnapshot;
}

const STORAGE_KEY = 'v1:desktop:layout-presets';

const clampNumber = (value: unknown, fallback: number | null = null) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return fallback;
};

const sanitizeVector = (value: unknown): DesktopLayoutVector | null => {
  if (!value || typeof value !== 'object') return null;
  const x = clampNumber((value as DesktopLayoutVector).x);
  const y = clampNumber((value as DesktopLayoutVector).y);
  if (typeof x === 'number' && typeof y === 'number') {
    return { x, y };
  }
  return null;
};

const sanitizeSize = (value: unknown): DesktopLayoutSize | null => {
  if (!value || typeof value !== 'object') return null;
  const width = clampNumber((value as DesktopLayoutSize).width);
  const height = clampNumber((value as DesktopLayoutSize).height);
  if (typeof width === 'number' && typeof height === 'number') {
    return { width, height };
  }
  return null;
};

const sanitizeBooleanMap = (value: unknown): Record<string, boolean> => {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, boolean> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    if (typeof key !== 'string' || !key) return;
    result[key] = Boolean(entry);
  });
  return result;
};

const sanitizeVectorMap = (value: unknown): Record<string, DesktopLayoutVector> => {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, DesktopLayoutVector> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    if (typeof key !== 'string' || !key) return;
    const vector = sanitizeVector(entry);
    if (vector) {
      result[key] = vector;
    }
  });
  return result;
};

const sanitizeSizeMap = (value: unknown): Record<string, DesktopLayoutSize> => {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, DesktopLayoutSize> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    if (typeof key !== 'string' || !key) return;
    const size = sanitizeSize(entry);
    if (size) {
      result[key] = size;
    }
  });
  return result;
};

const sanitizeWorkspace = (value: unknown): DesktopLayoutWorkspaceState | null => {
  if (!value || typeof value !== 'object') return null;
  const { id, label } = value as { id?: unknown; label?: unknown };
  const numericId = typeof id === 'number' && Number.isFinite(id) ? id : null;
  if (numericId === null) return null;
  return {
    id: numericId,
    label: typeof label === 'string' ? label : undefined,
    focused_windows: sanitizeBooleanMap((value as Record<string, unknown>).focused_windows),
    closed_windows: sanitizeBooleanMap((value as Record<string, unknown>).closed_windows),
    minimized_windows: sanitizeBooleanMap((value as Record<string, unknown>).minimized_windows),
    window_positions: sanitizeVectorMap((value as Record<string, unknown>).window_positions),
    window_sizes: sanitizeSizeMap((value as Record<string, unknown>).window_sizes),
  };
};

const sanitizeSnapshot = (value: unknown): DesktopLayoutSnapshot | null => {
  if (!value || typeof value !== 'object') return null;
  const snapshot = value as DesktopLayoutSnapshot;
  const workspacesRaw = Array.isArray(snapshot.workspaces) ? snapshot.workspaces : [];
  const workspaces = workspacesRaw
    .map(entry => sanitizeWorkspace(entry))
    .filter((entry): entry is DesktopLayoutWorkspaceState => Boolean(entry));

  const desktopApps = Array.isArray(snapshot.desktopApps)
    ? snapshot.desktopApps.filter((entry): entry is string => typeof entry === 'string')
    : [];

  const viewport = snapshot.viewport && typeof snapshot.viewport === 'object'
    ? {
        width: clampNumber(snapshot.viewport.width, null),
        height: clampNumber(snapshot.viewport.height, null),
      }
    : undefined;

  return {
    version: typeof snapshot.version === 'number' ? snapshot.version : 1,
    capturedAt: typeof snapshot.capturedAt === 'number' ? snapshot.capturedAt : Date.now(),
    viewport,
    desktopApps,
    desktopIconPositions: sanitizeVectorMap(snapshot.desktopIconPositions),
    iconSizePreset: typeof snapshot.iconSizePreset === 'string' ? snapshot.iconSizePreset : undefined,
    workspaces,
  };
};

const sanitizePreset = (value: unknown): DesktopLayoutPreset | null => {
  if (!value || typeof value !== 'object') return null;
  const preset = value as DesktopLayoutPreset;
  const id = typeof preset.id === 'string' && preset.id ? preset.id : null;
  const name = typeof preset.name === 'string' && preset.name ? preset.name : null;
  const createdAt = typeof preset.createdAt === 'number' ? preset.createdAt : Date.now();
  const layout = sanitizeSnapshot(preset.layout);
  if (!id || !name || !layout) return null;
  return {
    id,
    name,
    createdAt,
    layout,
  };
};

const clonePreset = (preset: DesktopLayoutPreset): DesktopLayoutPreset => ({
  id: preset.id,
  name: preset.name,
  createdAt: preset.createdAt,
  layout: {
    ...preset.layout,
    viewport: preset.layout.viewport
      ? { width: preset.layout.viewport.width, height: preset.layout.viewport.height }
      : undefined,
    desktopApps: [...preset.layout.desktopApps],
    desktopIconPositions: { ...preset.layout.desktopIconPositions },
    workspaces: preset.layout.workspaces.map(workspace => ({
      id: workspace.id,
      label: workspace.label,
      focused_windows: { ...workspace.focused_windows },
      closed_windows: { ...workspace.closed_windows },
      minimized_windows: { ...workspace.minimized_windows },
      window_positions: { ...workspace.window_positions },
      window_sizes: { ...workspace.window_sizes },
    })),
  },
});

const persistPresets = (presets: DesktopLayoutPreset[]): DesktopLayoutPreset[] => {
  if (!safeLocalStorage) return presets;
  try {
    const payload = JSON.stringify(presets);
    safeLocalStorage.setItem(STORAGE_KEY, payload);
  } catch (e) {
    // ignore persistence errors
  }
  return presets;
};

export const loadDesktopLayoutPresets = (): DesktopLayoutPreset[] => {
  if (!safeLocalStorage) return [];
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    const sanitized = parsed
      .map(entry => sanitizePreset(entry))
      .filter((entry): entry is DesktopLayoutPreset => Boolean(entry))
      .map(clonePreset);
    sanitized.sort((a, b) => b.createdAt - a.createdAt);
    return sanitized;
  } catch (e) {
    return [];
  }
};

export const saveDesktopLayoutPreset = (preset: DesktopLayoutPreset): DesktopLayoutPreset[] => {
  const current = loadDesktopLayoutPresets();
  const filtered = current.filter(entry => entry.id !== preset.id);
  const next = [clonePreset(preset), ...filtered];
  next.sort((a, b) => b.createdAt - a.createdAt);
  return persistPresets(next);
};

export const deleteDesktopLayoutPreset = (id: string): DesktopLayoutPreset[] => {
  if (typeof id !== 'string' || !id) {
    return loadDesktopLayoutPresets();
  }
  const current = loadDesktopLayoutPresets();
  const next = current.filter(entry => entry.id !== id);
  if (next.length === current.length) {
    return next;
  }
  return persistPresets(next);
};
