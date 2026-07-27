import { safeLocalStorage } from '../../utils/safeStorage';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const STORAGE_KEY = 'wm:placements';

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  if (min > max) return min;
  return Math.min(Math.max(value, min), max);
}

function sanitizeLength(value: number | undefined) {
  if (!Number.isFinite(value ?? NaN)) return 0;
  return Math.max(value ?? 0, 0);
}

function sanitizeCoordinate(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value ?? NaN)) return fallback;
  return value ?? fallback;
}

export interface ScreenLike {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  availLeft?: number;
  availTop?: number;
  availWidth?: number;
  availHeight?: number;
  isPrimary?: boolean;
}

export interface WindowRect {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

interface NormalizedScreen extends ScreenLike {
  availLeft: number;
  availTop: number;
  availWidth: number;
  availHeight: number;
}

interface StoredRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface StoredPlacement {
  preferredScreenId: string;
  preferredRect: StoredRect;
  fallback?: {
    screenId: string;
    rect: StoredRect;
  };
  lastActiveScreenId?: string;
}

type PlacementState = Record<string, StoredPlacement>;

function normalizeScreen(screen: ScreenLike): NormalizedScreen {
  return {
    ...screen,
    availLeft: screen.availLeft ?? screen.left,
    availTop: screen.availTop ?? screen.top,
    availWidth: screen.availWidth ?? screen.width,
    availHeight: screen.availHeight ?? screen.height,
  };
}

function clampRect(rect: WindowRect | undefined, screen: NormalizedScreen): StoredRect {
  const width = sanitizeLength(rect?.width);
  const height = sanitizeLength(rect?.height);
  const minX = screen.availLeft;
  const minY = screen.availTop;
  const maxX = minX + Math.max(screen.availWidth - width, 0);
  const maxY = minY + Math.max(screen.availHeight - height, 0);

  const x = sanitizeCoordinate(rect?.x, minX);
  const y = sanitizeCoordinate(rect?.y, minY);

  return {
    x: clampNumber(x, minX, maxX),
    y: clampNumber(y, minY, maxY),
    width,
    height,
  };
}

function loadPlacements(storage: StorageLike | null | undefined): PlacementState {
  if (!storage) return {};
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as PlacementState;
  } catch {
    return {};
  }
}

function persistPlacements(
  storage: StorageLike | null | undefined,
  placements: PlacementState,
) {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(placements));
  } catch {
    // ignore write errors, e.g., quota exceeded
  }
}

function determineFallbackScreenId(screens: Map<string, NormalizedScreen>) {
  for (const screen of screens.values()) {
    if (screen.isPrimary) return screen.id;
  }
  const first = screens.values().next();
  return first.done ? null : first.value.id;
}

function rectFromResolved(resolved: ResolvedPlacement): StoredRect {
  return {
    x: resolved.x,
    y: resolved.y,
    width: resolved.width,
    height: resolved.height,
  };
}

export interface ResolvedPlacement extends StoredRect {
  windowId: string;
  screenId: string;
  preferredScreenId: string;
  usingFallback: boolean;
}

export interface PlacementOptions {
  storage?: StorageLike | null;
}

export class PlacementManager {
  private placements: PlacementState;

  private screens: Map<string, NormalizedScreen> = new Map();

  private storage: StorageLike | null;

  private fallbackScreenId: string | null = null;

  constructor(options: PlacementOptions = {}) {
    this.storage = options.storage ?? safeLocalStorage ?? null;
    this.placements = loadPlacements(this.storage);
  }

  setScreens(screens: ScreenLike[] = []) {
    this.screens = new Map();
    for (const screen of screens) {
      const normalized = normalizeScreen(screen);
      this.screens.set(normalized.id, normalized);
    }
    this.fallbackScreenId = determineFallbackScreenId(this.screens);

    const updates: ResolvedPlacement[] = [];
    for (const [windowId, placement] of Object.entries(this.placements)) {
      const resolved = this.resolvePlacement(windowId, placement);
      const previous = placement.lastActiveScreenId;
      placement.lastActiveScreenId = resolved.screenId;
      if (resolved.screenId === placement.preferredScreenId) {
        placement.preferredRect = rectFromResolved(resolved);
        placement.fallback = undefined;
      } else {
        placement.fallback = {
          screenId: resolved.screenId,
          rect: rectFromResolved(resolved),
        };
      }
      if (!previous || previous !== resolved.screenId) {
        updates.push(resolved);
      }
    }

    if (updates.length) {
      this.persist();
    } else {
      // Even without updates we still want to persist clamped values
      this.persist();
    }

    return updates;
  }

  updatePlacement(windowId: string, screenId: string, rect: WindowRect): ResolvedPlacement {
    const screen = this.getScreen(screenId);
    const normalizedRect = screen ? clampRect(rect, screen) : {
      x: rect.x,
      y: rect.y,
      width: sanitizeLength(rect.width),
      height: sanitizeLength(rect.height),
    };

    let placement = this.placements[windowId];
    if (!placement) {
      placement = {
        preferredScreenId: screenId,
        preferredRect: normalizedRect,
        lastActiveScreenId: screenId,
      };
      this.placements[windowId] = placement;
      this.persist();
      return {
        windowId,
        screenId,
        preferredScreenId: placement.preferredScreenId,
        usingFallback: false,
        ...normalizedRect,
      };
    }

    const preferredOnline = this.screens.has(placement.preferredScreenId);

    if (screenId === placement.preferredScreenId) {
      placement.preferredRect = normalizedRect;
      placement.fallback = undefined;
    } else if (!preferredOnline) {
      placement.fallback = { screenId, rect: normalizedRect };
    } else {
      placement.preferredScreenId = screenId;
      placement.preferredRect = normalizedRect;
      placement.fallback = undefined;
    }

    placement.lastActiveScreenId = screenId;
    this.persist();

    return {
      windowId,
      screenId,
      preferredScreenId: placement.preferredScreenId,
      usingFallback: placement.preferredScreenId !== screenId,
      ...normalizedRect,
    };
  }

  getPlacement(windowId: string, preferredScreenId?: string): ResolvedPlacement {
    let placement = this.placements[windowId];
    if (!placement) {
      const screen = this.getScreen(preferredScreenId) ?? this.getFallbackScreen();
      const screenId = screen?.id ?? preferredScreenId ?? this.fallbackScreenId ?? 'primary';
      const rect = screen ? clampRect(undefined, screen) : {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      };
      placement = {
        preferredScreenId: screenId,
        preferredRect: rect,
        lastActiveScreenId: screenId,
      };
      this.placements[windowId] = placement;
    } else if (preferredScreenId && placement.preferredScreenId !== preferredScreenId) {
      placement.preferredScreenId = preferredScreenId;
    }

    const resolved = this.resolvePlacement(windowId, placement);
    placement.lastActiveScreenId = resolved.screenId;
    if (resolved.screenId === placement.preferredScreenId) {
      placement.preferredRect = rectFromResolved(resolved);
      placement.fallback = undefined;
    } else {
      placement.fallback = {
        screenId: resolved.screenId,
        rect: rectFromResolved(resolved),
      };
    }
    this.persist();
    return resolved;
  }

  clear(windowId?: string) {
    if (windowId) {
      delete this.placements[windowId];
    } else {
      this.placements = {};
    }
    this.persist();
  }

  private getScreen(screenId?: string | null) {
    if (!screenId) return undefined;
    return this.screens.get(screenId);
  }

  private getFallbackScreen() {
    if (!this.fallbackScreenId) return undefined;
    return this.screens.get(this.fallbackScreenId);
  }

  private resolvePlacement(windowId: string, placement: StoredPlacement): ResolvedPlacement {
    const preferredScreen = this.getScreen(placement.preferredScreenId);
    if (preferredScreen) {
      const rect = clampRect(placement.preferredRect, preferredScreen);
      placement.preferredRect = rect;
      return {
        windowId,
        screenId: preferredScreen.id,
        preferredScreenId: placement.preferredScreenId,
        usingFallback: false,
        ...rect,
      };
    }

    if (placement.fallback) {
      const fallbackScreen = this.getScreen(placement.fallback.screenId);
      if (fallbackScreen) {
        const rect = clampRect(placement.fallback.rect, fallbackScreen);
        placement.fallback.rect = rect;
        return {
          windowId,
          screenId: fallbackScreen.id,
          preferredScreenId: placement.preferredScreenId,
          usingFallback: true,
          ...rect,
        };
      }
    }

    const fallbackScreen = this.getFallbackScreen();
    if (fallbackScreen) {
      const rect = clampRect(placement.preferredRect, fallbackScreen);
      placement.fallback = { screenId: fallbackScreen.id, rect };
      return {
        windowId,
        screenId: fallbackScreen.id,
        preferredScreenId: placement.preferredScreenId,
        usingFallback: true,
        ...rect,
      };
    }

    const rect = {
      x: placement.preferredRect?.x ?? 0,
      y: placement.preferredRect?.y ?? 0,
      width: placement.preferredRect?.width ?? 0,
      height: placement.preferredRect?.height ?? 0,
    };
    return {
      windowId,
      screenId: placement.preferredScreenId,
      preferredScreenId: placement.preferredScreenId,
      usingFallback: true,
      ...rect,
    };
  }

  private persist() {
    persistPlacements(this.storage, this.placements);
  }
}

export const clampToScreenBounds = clampRect;
