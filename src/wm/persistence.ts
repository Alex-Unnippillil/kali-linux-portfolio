export interface ViewportSize {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowSnapshot {
  id: string;
  bounds: Rect;
  groupId?: string;
  zIndex?: number;
}

export interface WindowGroupSnapshot {
  id: string;
  windows: WindowSnapshot[];
}

export interface SerializedWindow {
  id: string;
  groupId?: string;
  z?: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SerializedGroup {
  id: string;
  bounds: Rect;
  windows: SerializedWindow[];
}

export interface SerializedLayout {
  version: number;
  viewport: ViewportSize;
  groups: SerializedGroup[];
}

export interface LayoutRecord {
  id: string;
  name: string;
  savedAt: number;
  layout: SerializedLayout;
}

export interface LayoutEventWindow {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  groupId?: string;
  zIndex?: number;
}

export interface LayoutEventDetail {
  windows: LayoutEventWindow[];
  groups: Array<{
    id: string;
    windows: LayoutEventWindow[];
  }>;
}

export interface SaveLayoutOptions {
  name?: string;
  groups?: WindowGroupSnapshot[];
  viewport?: ViewportSize;
}

export interface RestoreLayoutOptions {
  layout?: LayoutRecord;
  id?: string;
  viewport?: ViewportSize;
}

export const LAYOUT_STORAGE_KEY = 'desktop-layouts.v1';
const STORAGE_VERSION = 1;
const DEFAULT_GROUP_ID = 'default';

const round = (value: number, precision = 4) =>
  Number.isFinite(value)
    ? Number(value.toFixed(precision))
    : 0;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const safeViewport = (viewport?: ViewportSize): ViewportSize => {
  if (viewport && viewport.width > 0 && viewport.height > 0) {
    return viewport;
  }
  if (typeof window !== 'undefined') {
    return {
      width: window.innerWidth || 1,
      height: window.innerHeight || 1,
    };
  }
  return { width: 1, height: 1 };
};

const toRelative = (value: number, base: number) =>
  base <= 0 ? 0 : round(value / base, 4);

const toAbsolute = (value: number, base: number) =>
  round(clamp(value, 0, 1) * base, 2);

const computeBounds = (windows: WindowSnapshot[]): Rect => {
  if (!windows.length) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  windows.forEach(({ bounds }) => {
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  });
  return {
    x: Number.isFinite(minX) ? minX : 0,
    y: Number.isFinite(minY) ? minY : 0,
    width: Number.isFinite(maxX - minX) ? maxX - minX : 0,
    height: Number.isFinite(maxY - minY) ? maxY - minY : 0,
  };
};

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `layout-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
};

const parsePx = (value: string | null | undefined) => {
  if (!value) return undefined;
  const parsed = parseFloat(value.toString().replace('px', ''));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const readStorage = (): LayoutRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as LayoutRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is LayoutRecord =>
        entry && typeof entry === 'object' && typeof entry.id === 'string' && entry.layout?.version === STORAGE_VERSION,
    );
  } catch {
    return [];
  }
};

const writeStorage = (layouts: LayoutRecord[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layouts));
  } catch {
    // Ignore write failures
  }
};

export const listLayouts = (): LayoutRecord[] => {
  const entries = readStorage();
  return entries
    .slice()
    .sort((a, b) => b.savedAt - a.savedAt);
};

export const removeLayout = (id: string) => {
  const entries = readStorage();
  const next = entries.filter((entry) => entry.id !== id);
  writeStorage(next);
};

export const serializeLayout = (
  groups: WindowGroupSnapshot[],
  viewport?: ViewportSize,
): SerializedLayout => {
  const vp = safeViewport(viewport);
  const normalizedGroups: SerializedGroup[] = [];
  groups.forEach((group) => {
    if (!group || !Array.isArray(group.windows)) return;
    const filteredWindows = group.windows.filter((win) => win && win.id && win.bounds);
    if (!filteredWindows.length) return;
    const bounds = computeBounds(filteredWindows);
    normalizedGroups.push({
      id: group.id || DEFAULT_GROUP_ID,
      bounds: {
        x: toRelative(bounds.x, vp.width),
        y: toRelative(bounds.y, vp.height),
        width: toRelative(bounds.width, vp.width),
        height: toRelative(bounds.height, vp.height),
      },
      windows: filteredWindows.map((win) => ({
        id: win.id,
        groupId: win.groupId || group.id || DEFAULT_GROUP_ID,
        z: typeof win.zIndex === 'number' ? win.zIndex : undefined,
        x: toRelative(win.bounds.x, vp.width),
        y: toRelative(win.bounds.y, vp.height),
        width: toRelative(win.bounds.width, vp.width),
        height: toRelative(win.bounds.height, vp.height),
      })),
    });
  });
  return {
    version: STORAGE_VERSION,
    viewport: vp,
    groups: normalizedGroups,
  };
};

export const deserializeLayout = (
  serialized: SerializedLayout,
  viewport?: ViewportSize,
): WindowGroupSnapshot[] => {
  const vp = safeViewport(viewport);
  return serialized.groups.map((group) => ({
    id: group.id,
    windows: group.windows.map((win) => ({
      id: win.id,
      groupId: win.groupId || group.id,
      zIndex: win.z,
      bounds: {
        x: toAbsolute(win.x, vp.width),
        y: toAbsolute(win.y, vp.height),
        width: toAbsolute(win.width, vp.width),
        height: toAbsolute(win.height, vp.height),
      },
    })),
  }));
};

export const saveLayout = ({ name, groups, viewport }: SaveLayoutOptions = {}): LayoutRecord | null => {
  const snapshotGroups = groups ?? collectWindowGroups();
  if (!snapshotGroups.length) return null;
  const record: LayoutRecord = {
    id: createId(),
    name: name?.trim() || `Layout ${new Date().toLocaleString()}`,
    savedAt: Date.now(),
    layout: serializeLayout(snapshotGroups, viewport),
  };
  const entries = readStorage();
  entries.push(record);
  writeStorage(entries);
  return record;
};

const flattenForEvent = (
  groups: WindowGroupSnapshot[],
  viewport: ViewportSize,
): LayoutEventDetail => {
  const windows: LayoutEventWindow[] = [];
  const grouped: LayoutEventDetail['groups'] = [];
  groups.forEach((group) => {
    const groupWindows: LayoutEventWindow[] = group.windows.map((win) => {
      const percentWidth = viewport.width <= 0 ? 0 : round((win.bounds.width / viewport.width) * 100, 3);
      const percentHeight = viewport.height <= 0 ? 0 : round((win.bounds.height / viewport.height) * 100, 3);
      const normalized: LayoutEventWindow = {
        id: win.id,
        groupId: win.groupId || group.id,
        zIndex: win.zIndex,
        x: round(win.bounds.x, 2),
        y: round(win.bounds.y, 2),
        width: percentWidth,
        height: percentHeight,
      };
      windows.push(normalized);
      return normalized;
    });
    grouped.push({
      id: group.id,
      windows: groupWindows,
    });
  });
  return { windows, groups: grouped };
};

const updateSessionStorage = (detail: LayoutEventDetail) => {
  if (typeof window === 'undefined') return;
  try {
    const stored = window.localStorage.getItem('desktop-session');
    const session = stored ? JSON.parse(stored) : {};
    const next = {
      windows: detail.windows.map((win) => ({
        id: win.id,
        x: win.x,
        y: win.y,
        width: win.width,
        height: win.height,
        groupId: win.groupId,
      })),
      wallpaper: session.wallpaper || '',
      dock: Array.isArray(session.dock) ? session.dock : [],
    };
    window.localStorage.setItem('desktop-session', JSON.stringify({ ...session, ...next }));
  } catch {
    // Ignore persistence errors
  }
};

export const restoreLayout = async ({ layout, id, viewport }: RestoreLayoutOptions): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  let record: LayoutRecord | undefined = layout;
  if (!record && id) {
    record = listLayouts().find((entry) => entry.id === id);
  }
  if (!record) return false;
  const vp = safeViewport(viewport);
  const groups = deserializeLayout(record.layout, vp);
  if (!groups.length) return false;
  const detail = flattenForEvent(groups, vp);
  updateSessionStorage(detail);
  const event = new CustomEvent<LayoutEventDetail>('wm:apply-layout', {
    detail,
  });
  window.dispatchEvent(event);
  return true;
};

export const collectWindowGroups = (): WindowGroupSnapshot[] => {
  if (typeof document === 'undefined') return [];
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('.main-window'));
  if (!nodes.length) return [];
  const map = new Map<string, WindowGroupSnapshot>();
  nodes.forEach((node) => {
    if (!node || node.classList.contains('closed-window')) return;
    const id = node.id || node.getAttribute('data-app-id');
    if (!id) return;
    const rect = node.getBoundingClientRect();
    const xProp = parsePx(node.style.getPropertyValue('--window-transform-x'));
    const yProp = parsePx(node.style.getPropertyValue('--window-transform-y'));
    const groupId = node.dataset.windowGroup || DEFAULT_GROUP_ID;
    const zIndex = parseInt(window.getComputedStyle(node).zIndex || '', 10);
    const width = rect.width;
    const height = rect.height;
    if (!(width > 0 && height > 0)) return;
    const snapshot: WindowSnapshot = {
      id,
      groupId,
      zIndex: Number.isFinite(zIndex) ? zIndex : undefined,
      bounds: {
        x: xProp ?? rect.left,
        y: yProp ?? rect.top,
        width,
        height,
      },
    };
    const group = map.get(groupId);
    if (group) {
      group.windows.push(snapshot);
    } else {
      map.set(groupId, { id: groupId, windows: [snapshot] });
    }
  });
  return Array.from(map.values());
};

export const getLayoutById = (id: string): LayoutRecord | undefined =>
  listLayouts().find((entry) => entry.id === id);

