import { safeLocalStorage } from '@/utils/safeStorage';

export const SCREEN_ASSIGNMENTS_KEY = 'wm:screen-assignments';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenInfo extends Rect {
  id: string;
  isPrimary?: boolean;
}

export interface StoredPlacement {
  preferredMonitorId: string;
  lastActiveMonitorId: string;
  rects: Record<string, Rect>;
}

export type PlacementState = Record<string, StoredPlacement>;

export interface WindowPlacement {
  monitorId: string;
  geometry: Rect;
  preferredMonitorId: string;
}

export interface PlaceWindowOptions {
  storage?: Storage;
  state?: PlacementState;
  persist?: boolean;
}

export interface PlaceWindowResult extends WindowPlacement {
  state: PlacementState;
}

export interface ReconcileOptions {
  storage?: Storage;
  persist?: boolean;
}

interface ScreenDetailedLike {
  id?: string;
  label?: string;
  primary?: boolean;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  availLeft?: number;
  availTop?: number;
  availWidth?: number;
  availHeight?: number;
}

interface ScreenDetailsLike {
  currentScreen?: ScreenDetailedLike;
  screens: ScreenDetailedLike[];
}

const DEFAULT_MONITOR_WIDTH = 1280;
const DEFAULT_MONITOR_HEIGHT = 720;
const MIN_WINDOW_WIDTH = 320;
const MIN_WINDOW_HEIGHT = 240;

function numberOrFallback(...values: Array<number | undefined | null>): number {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

function normaliseDetailedScreen(
  screen: ScreenDetailedLike,
  current: ScreenDetailedLike | undefined,
  index: number,
  win?: Window
): ScreenInfo {
  const width = numberOrFallback(screen.availWidth, screen.width, win?.innerWidth, DEFAULT_MONITOR_WIDTH);
  const height = numberOrFallback(screen.availHeight, screen.height, win?.innerHeight, DEFAULT_MONITOR_HEIGHT);
  const x = numberOrFallback(screen.availLeft, screen.left, 0);
  const y = numberOrFallback(screen.availTop, screen.top, 0);
  const hasCurrentId = current?.id !== undefined;
  const isPrimary =
    typeof screen.primary === 'boolean'
      ? screen.primary
      : hasCurrentId && screen.id !== undefined
        ? screen.id === current?.id
        : index === 0;

  return {
    id: String(screen.id ?? screen.label ?? index),
    x,
    y,
    width,
    height,
    isPrimary,
  };
}

function createVirtualMonitor(rect?: Rect): ScreenInfo {
  const width = rect ? Math.max(rect.width, MIN_WINDOW_WIDTH) : DEFAULT_MONITOR_WIDTH;
  const height = rect ? Math.max(rect.height, MIN_WINDOW_HEIGHT) : DEFAULT_MONITOR_HEIGHT;
  return {
    id: 'virtual',
    x: rect?.x ?? 0,
    y: rect?.y ?? 0,
    width,
    height,
    isPrimary: true,
  };
}

function ensureMonitors(monitors: ScreenInfo[], desired?: Rect): ScreenInfo[] {
  if (monitors.length) {
    return monitors;
  }
  return [createVirtualMonitor(desired)];
}

function clonePlacementState(state: PlacementState): PlacementState {
  const clone: PlacementState = {};
  for (const [key, placement] of Object.entries(state)) {
    clone[key] = {
      preferredMonitorId: placement.preferredMonitorId,
      lastActiveMonitorId: placement.lastActiveMonitorId,
      rects: { ...placement.rects },
    };
  }
  return clone;
}

function isRect(value: unknown): value is Rect {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const rect = value as Partial<Record<keyof Rect, unknown>>;
  const x = rect.x;
  const y = rect.y;
  const width = rect.width;
  const height = rect.height;
  return (
    typeof x === 'number' &&
    Number.isFinite(x) &&
    typeof y === 'number' &&
    Number.isFinite(y) &&
    typeof width === 'number' &&
    Number.isFinite(width) &&
    width >= 0 &&
    typeof height === 'number' &&
    Number.isFinite(height) &&
    height >= 0
  );
}

function normaliseStoredPlacement(value: unknown): StoredPlacement | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as Partial<StoredPlacement> & { rects?: Record<string, unknown> };
  if (typeof candidate.preferredMonitorId !== 'string') {
    return null;
  }
  const rects: Record<string, Rect> = {};
  if (candidate.rects && typeof candidate.rects === 'object') {
    for (const [key, rectValue] of Object.entries(candidate.rects)) {
      if (isRect(rectValue)) {
        rects[key] = { ...rectValue };
      }
    }
  }
  const lastActive =
    typeof candidate.lastActiveMonitorId === 'string'
      ? candidate.lastActiveMonitorId
      : candidate.preferredMonitorId;
  return {
    preferredMonitorId: candidate.preferredMonitorId,
    lastActiveMonitorId: lastActive,
    rects,
  };
}

function containsPoint(bounds: Rect, x: number, y: number): boolean {
  return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
}

function getMonitorForRect(rect: Rect, monitors: ScreenInfo[]): ScreenInfo | undefined {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  return monitors.find((monitor) => containsPoint(monitor, cx, cy));
}

function overlapArea(a: Rect, b: Rect): number {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (right <= left || bottom <= top) {
    return 0;
  }
  return (right - left) * (bottom - top);
}

function getMonitorWithGreatestOverlap(rect: Rect, monitors: ScreenInfo[]): ScreenInfo | undefined {
  let best: ScreenInfo | undefined;
  let bestArea = 0;
  for (const monitor of monitors) {
    const area = overlapArea(rect, monitor);
    if (area > bestArea) {
      best = monitor;
      bestArea = area;
    }
  }
  return best;
}

function getPrimaryMonitor(monitors: ScreenInfo[]): ScreenInfo {
  return monitors.find((monitor) => monitor.isPrimary) ?? monitors[0];
}

export function clampRectToBounds(rect: Rect, bounds: Rect): Rect {
  const width = Math.min(Math.max(rect.width, 0), bounds.width);
  const height = Math.min(Math.max(rect.height, 0), bounds.height);
  const maxX = bounds.x + bounds.width - width;
  const maxY = bounds.y + bounds.height - height;
  const x = Math.min(Math.max(rect.x, bounds.x), maxX >= bounds.x ? maxX : bounds.x);
  const y = Math.min(Math.max(rect.y, bounds.y), maxY >= bounds.y ? maxY : bounds.y);
  return {
    x,
    y,
    width,
    height,
  };
}

function createDefaultRect(monitor: ScreenInfo): Rect {
  const width = Math.min(Math.max(Math.round(monitor.width * 0.6), MIN_WINDOW_WIDTH), monitor.width);
  const height = Math.min(Math.max(Math.round(monitor.height * 0.6), MIN_WINDOW_HEIGHT), monitor.height);
  const x = monitor.x + Math.round((monitor.width - width) / 2);
  const y = monitor.y + Math.round((monitor.height - height) / 2);
  return { x, y, width, height };
}

export async function detectScreens(opts: { getWindow?: () => Window | undefined } = {}): Promise<ScreenInfo[]> {
  const getWindow = opts.getWindow ?? (() => (typeof window !== 'undefined' ? window : undefined));
  const win = getWindow();
  if (!win) {
    return [createVirtualMonitor()];
  }

  const anyWin = win as typeof win & { getScreens?: () => Promise<ScreenDetailsLike> };
  if (typeof anyWin.getScreens === 'function') {
    try {
      const details = await anyWin.getScreens();
      if (details && Array.isArray(details.screens) && details.screens.length > 0) {
        return details.screens.map((screen, index) => normaliseDetailedScreen(screen, details.currentScreen, index, win));
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('wm/detectScreens getScreens failed', error);
      }
    }
  }

  const screenObj = win.screen;
  const width = numberOrFallback(screenObj?.availWidth, screenObj?.width, win.innerWidth, DEFAULT_MONITOR_WIDTH);
  const height = numberOrFallback(screenObj?.availHeight, screenObj?.height, win.innerHeight, DEFAULT_MONITOR_HEIGHT);
  const x = numberOrFallback(screenObj?.availLeft, (screenObj as Partial<ScreenDetailedLike>)?.left, win.screenX, win.screenLeft, 0);
  const y = numberOrFallback(screenObj?.availTop, (screenObj as Partial<ScreenDetailedLike>)?.top, win.screenY, win.screenTop, 0);

  return [
    {
      id: 'primary',
      x,
      y,
      width,
      height,
      isPrimary: true,
    },
  ];
}

export function loadPlacementState(storage: Storage | undefined = safeLocalStorage): PlacementState {
  if (!storage) {
    return {};
  }
  const raw = storage.getItem(SCREEN_ASSIGNMENTS_KEY);
  if (!raw) {
    return {};
  }
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const state: PlacementState = {};
    for (const [key, value] of Object.entries(data)) {
      const placement = normaliseStoredPlacement(value);
      if (placement) {
        state[key] = placement;
      }
    }
    return state;
  } catch {
    return {};
  }
}

export function savePlacementState(state: PlacementState, storage: Storage | undefined = safeLocalStorage): void {
  if (!storage) {
    return;
  }
  const serialisable: Record<string, StoredPlacement> = {};
  for (const [key, placement] of Object.entries(state)) {
    serialisable[key] = {
      preferredMonitorId: placement.preferredMonitorId,
      lastActiveMonitorId: placement.lastActiveMonitorId,
      rects: { ...placement.rects },
    };
  }
  storage.setItem(SCREEN_ASSIGNMENTS_KEY, JSON.stringify(serialisable));
}

export function placeWindow(
  windowId: string,
  monitors: ScreenInfo[],
  desired?: Rect,
  options: PlaceWindowOptions = {}
): PlaceWindowResult {
  const storage = options.storage ?? safeLocalStorage;
  const baseState = options.state ?? loadPlacementState(storage);
  const state = clonePlacementState(baseState);
  const availableMonitors = ensureMonitors(monitors, desired);
  const screenMap = new Map(availableMonitors.map((monitor) => [monitor.id, monitor] as const));
  const stored = state[windowId];
  const storedPreferred = stored?.preferredMonitorId;
  const storedLastActive = stored?.lastActiveMonitorId ?? storedPreferred;
  let preferred = storedPreferred;
  let target: ScreenInfo | undefined;

  let geometryMonitor: ScreenInfo | undefined;
  if (desired) {
    geometryMonitor = getMonitorForRect(desired, availableMonitors) ?? getMonitorWithGreatestOverlap(desired, availableMonitors);
  }

  if (geometryMonitor && screenMap.has(geometryMonitor.id)) {
    if (!storedPreferred || geometryMonitor.id !== storedPreferred || !screenMap.has(storedPreferred)) {
      preferred = geometryMonitor.id;
      target = geometryMonitor;
    }
  }

  if (!target && storedPreferred && screenMap.has(storedPreferred)) {
    target = screenMap.get(storedPreferred);
  }

  if (!target && geometryMonitor && screenMap.has(geometryMonitor.id)) {
    target = geometryMonitor;
    if (!preferred) {
      preferred = geometryMonitor.id;
    }
  }

  if (!target) {
    target = getPrimaryMonitor(availableMonitors);
  }

  if (!preferred) {
    preferred = storedPreferred && !screenMap.has(storedPreferred) ? storedPreferred : target.id;
  }

  const rects = { ...(stored?.rects ?? {}) };
  let baseRect = desired;
  if (!baseRect) {
    if (target && rects[target.id]) {
      baseRect = rects[target.id];
    } else if (storedPreferred && rects[storedPreferred]) {
      baseRect = rects[storedPreferred];
    } else if (storedLastActive && rects[storedLastActive]) {
      baseRect = rects[storedLastActive];
    }
  }
  if (!baseRect) {
    baseRect = createDefaultRect(target);
  }

  const geometry = clampRectToBounds(baseRect, target);
  rects[target.id] = geometry;

  const placement: StoredPlacement = {
    preferredMonitorId: preferred,
    lastActiveMonitorId: target.id,
    rects,
  };

  const nextState: PlacementState = { ...state, [windowId]: placement };

  if (options.state) {
    options.state[windowId] = {
      preferredMonitorId: placement.preferredMonitorId,
      lastActiveMonitorId: placement.lastActiveMonitorId,
      rects: { ...placement.rects },
    };
  }

  if (options.persist ?? true) {
    savePlacementState(nextState, storage);
  }

  return {
    monitorId: target.id,
    geometry,
    preferredMonitorId: preferred,
    state: nextState,
  };
}

export function reconcilePlacementState(
  baseState: PlacementState,
  monitors: ScreenInfo[],
  options: ReconcileOptions = {}
): PlacementState {
  const storage = options.storage ?? safeLocalStorage;
  const availableMonitors = ensureMonitors(monitors);
  const primary = getPrimaryMonitor(availableMonitors);
  const screenMap = new Map(availableMonitors.map((monitor) => [monitor.id, monitor] as const));

  const nextState: PlacementState = {};
  for (const [windowId, placement] of Object.entries(baseState)) {
    const rects = { ...placement.rects };
    let preferred = placement.preferredMonitorId;
    let lastActive = placement.lastActiveMonitorId;

    if (!preferred) {
      preferred = lastActive || primary.id;
    }

    if (!lastActive || !screenMap.has(lastActive)) {
      if (preferred && screenMap.has(preferred)) {
        lastActive = preferred;
      } else {
        lastActive = primary.id;
      }
    }

    const activeMonitor = screenMap.get(lastActive) ?? primary;
    const preferredMonitor = preferred && screenMap.has(preferred) ? screenMap.get(preferred)! : undefined;

    const activeRect = rects[lastActive];
    rects[lastActive] = activeRect ? clampRectToBounds(activeRect, activeMonitor) : createDefaultRect(activeMonitor);

    if (preferredMonitor) {
      const rect = rects[preferred];
      rects[preferred] = rect ? clampRectToBounds(rect, preferredMonitor) : createDefaultRect(preferredMonitor);
    }

    nextState[windowId] = {
      preferredMonitorId: preferred,
      lastActiveMonitorId: lastActive,
      rects,
    };
  }

  if (options.persist ?? true) {
    savePlacementState(nextState, storage);
  }

  return nextState;
}
