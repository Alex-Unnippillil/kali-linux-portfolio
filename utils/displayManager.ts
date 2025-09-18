export interface DisplayDefinition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type DisplayInput = Partial<DisplayDefinition> & { id: string };

const DEFAULT_DISPLAY: DisplayDefinition = {
  id: 'display-0',
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
  scale: 1,
};

let overrideDisplays: DisplayDefinition[] | null = null;

const parseNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const normalizeDisplay = (display: DisplayInput): DisplayDefinition => {
  return {
    id: display.id,
    x: parseNumber(display.x, 0),
    y: parseNumber(display.y, 0),
    width: Math.max(1, parseNumber(display.width, DEFAULT_DISPLAY.width)),
    height: Math.max(1, parseNumber(display.height, DEFAULT_DISPLAY.height)),
    scale: Math.max(0.1, parseNumber(display.scale, 1)),
  };
};

const notifyLayoutChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kali-display-change'));
  }
};

export const setDisplayLayoutOverride = (layout: DisplayInput[] | null) => {
  overrideDisplays = layout ? layout.map(normalizeDisplay) : null;
  notifyLayoutChange();
};

export const getDisplayLayout = (): DisplayDefinition[] => {
  if (overrideDisplays && overrideDisplays.length) {
    return overrideDisplays;
  }
  if (typeof window === 'undefined') {
    return [DEFAULT_DISPLAY];
  }
  const width = window.innerWidth || DEFAULT_DISPLAY.width;
  const height = window.innerHeight || DEFAULT_DISPLAY.height;
  const scale = window.devicePixelRatio || 1;
  return [
    {
      id: DEFAULT_DISPLAY.id,
      x: 0,
      y: 0,
      width,
      height,
      scale,
    },
  ];
};

export const getDisplayById = (id: string | null | undefined, displays = getDisplayLayout()) => {
  if (!id) return displays[0];
  return displays.find((display) => display.id === id) ?? displays[0];
};

export const getWorkspaceRect = (displays = getDisplayLayout()): Rect => {
  const minX = Math.min(...displays.map((d) => d.x));
  const minY = Math.min(...displays.map((d) => d.y));
  const maxX = Math.max(...displays.map((d) => d.x + d.width));
  const maxY = Math.max(...displays.map((d) => d.y + d.height));
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

export const findDisplayForRect = (rect: Rect | null | undefined, displays = getDisplayLayout()) => {
  if (!rect) return displays[0];
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const containing = displays.find(
    (display) =>
      centerX >= display.x &&
      centerX <= display.x + display.width &&
      centerY >= display.y &&
      centerY <= display.y + display.height,
  );
  if (containing) return containing;
  // Fallback: choose display with greatest overlap area
  let best: DisplayDefinition | null = null;
  let bestArea = -1;
  for (const display of displays) {
    const overlapX = Math.max(0, Math.min(rect.x + rect.width, display.x + display.width) - Math.max(rect.x, display.x));
    const overlapY = Math.max(0, Math.min(rect.y + rect.height, display.y + display.height) - Math.max(rect.y, display.y));
    const area = overlapX * overlapY;
    if (area > bestArea) {
      best = display;
      bestArea = area;
    }
  }
  return best ?? displays[0];
};

export const clampRectToDisplay = (rect: Rect, display: DisplayDefinition): Rect => {
  const maxX = display.x + display.width - rect.width;
  const maxY = display.y + display.height - rect.height;
  return {
    x: Math.min(Math.max(rect.x, display.x), Math.max(display.x, maxX)),
    y: Math.min(Math.max(rect.y, display.y), Math.max(display.y, maxY)),
    width: rect.width,
    height: rect.height,
  };
};

export const scaleSizeBetweenDisplays = (
  width: number,
  height: number,
  fromDisplay: DisplayDefinition | null | undefined,
  toDisplay: DisplayDefinition,
): { width: number; height: number } => {
  if (!fromDisplay) {
    return {
      width: Math.min(width, toDisplay.width),
      height: Math.min(height, toDisplay.height),
    };
  }
  const ratio = fromDisplay.scale / toDisplay.scale;
  const nextWidth = Math.min(Math.max(width * ratio, toDisplay.width * 0.2), toDisplay.width);
  const nextHeight = Math.min(Math.max(height * ratio, toDisplay.height * 0.2), toDisplay.height);
  return {
    width: nextWidth,
    height: nextHeight,
  };
};

declare global {
  interface Window {
    __KALI_DISPLAY_OVERRIDE__?: DisplayInput[];
    __kaliSetDisplayLayout?: (layout: DisplayInput[]) => void;
    __kaliResetDisplayLayout?: () => void;
  }
}

const getGlobalWindow = () => {
  if (typeof globalThis === 'undefined') return undefined;
  if (!('window' in globalThis)) return undefined;
  const candidate = (globalThis as typeof globalThis & { window?: unknown }).window;
  return candidate && typeof candidate === 'object' ? (candidate as Window & typeof globalThis) : undefined;
};

const bootstrapWindowBindings = () => {
  const globalWindow = getGlobalWindow();
  if (!globalWindow) return;
  if (Array.isArray(globalWindow.__KALI_DISPLAY_OVERRIDE__)) {
    setDisplayLayoutOverride(globalWindow.__KALI_DISPLAY_OVERRIDE__);
  }
  globalWindow.__kaliSetDisplayLayout = (layout: DisplayInput[]) => {
    setDisplayLayoutOverride(layout);
  };
  globalWindow.__kaliResetDisplayLayout = () => {
    setDisplayLayoutOverride(null);
  };
};

bootstrapWindowBindings();

export const DEFAULT_DISPLAY_ID = DEFAULT_DISPLAY.id;

export default getDisplayLayout;
