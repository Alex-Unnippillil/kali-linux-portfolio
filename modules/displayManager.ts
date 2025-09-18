export interface DisplayInfo {
  id: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  scaleFactor: number;
  isPrimary: boolean;
}

interface WindowSize {
  width: number;
  height: number;
}

export interface WindowPlacementOptions {
  defaultWidth?: number;
  defaultHeight?: number;
  existingPosition?: { x: number; y: number } | null;
}

export interface DisplayChangeDetail {
  activeDisplay: DisplayInfo;
  displays: DisplayInfo[];
}

type Listener = (detail: DisplayChangeDetail) => void;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const cloneDisplay = (display: DisplayInfo): DisplayInfo => ({ ...display });

const DEFAULT_PRIMARY_ID = 'primary';

const readWindowMetric = <K extends keyof Screen>(key: K, fallback: number): number => {
  if (typeof window === 'undefined') return fallback;
  const scr = window.screen as Screen | undefined;
  if (!scr) return fallback;
  const value = scr[key];
  return typeof value === 'number' ? value : fallback;
};

const getWindowCoordinate = (key: 'screenLeft' | 'screenX' | 'screenTop' | 'screenY'): number => {
  if (typeof window === 'undefined') return 0;
  const value = (window as any)[key];
  return typeof value === 'number' ? value : 0;
};

const createFallbackDisplays = (): DisplayInfo[] => {
  const width = typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 1280;
  const height = typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 720;
  const scale = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const left = typeof window !== 'undefined' ? getWindowCoordinate('screenLeft') : 0;
  const top = typeof window !== 'undefined' ? getWindowCoordinate('screenTop') : 0;

  const primary: DisplayInfo = {
    id: DEFAULT_PRIMARY_ID,
    label: 'Primary Display',
    left,
    top,
    width,
    height,
    scaleFactor: scale,
    isPrimary: true,
  };

  const secondary: DisplayInfo = {
    id: 'secondary',
    label: 'Secondary Display',
    left: left + width,
    top,
    width: Math.round(width * 0.9),
    height: Math.round(height * 0.9),
    scaleFactor: 1,
    isPrimary: false,
  };

  return [primary, secondary];
};

const readDisplaysFromWindow = (): DisplayInfo[] => {
  if (typeof window === 'undefined') {
    return createFallbackDisplays();
  }

  const availWidth = readWindowMetric('availWidth', window.innerWidth || 1280);
  const availHeight = readWindowMetric('availHeight', window.innerHeight || 720);
  const left = getWindowCoordinate('screenLeft') || getWindowCoordinate('screenX');
  const top = getWindowCoordinate('screenTop') || getWindowCoordinate('screenY');
  const scale = window.devicePixelRatio || 1;

  const primary: DisplayInfo = {
    id: DEFAULT_PRIMARY_ID,
    label: 'Primary Display',
    left,
    top,
    width: availWidth,
    height: availHeight,
    scaleFactor: scale,
    isPrimary: true,
  };

  const secondary: DisplayInfo = {
    id: 'secondary',
    label: 'Secondary Display',
    left: left + availWidth,
    top,
    width: Math.round(availWidth * 0.85),
    height: Math.round(availHeight * 0.9),
    scaleFactor: 1,
    isPrimary: false,
  };

  return [primary, secondary];
};

export class DisplayManager {
  private displays: DisplayInfo[];
  private activeDisplayId: string;
  private listeners: Set<Listener> = new Set();
  private autoDetect: boolean;

  constructor(initialDisplays?: DisplayInfo[], options: { autoDetect?: boolean } = {}) {
    const source = initialDisplays && initialDisplays.length > 0 ? initialDisplays : createFallbackDisplays();
    this.displays = source.map(cloneDisplay);
    this.activeDisplayId = this.displays[0]?.id || DEFAULT_PRIMARY_ID;
    this.autoDetect = options.autoDetect !== undefined ? options.autoDetect : true;

    if (this.autoDetect && typeof window !== 'undefined') {
      this.syncWithWindow();
      window.addEventListener('resize', this.handleResize);
    }
  }

  private handleResize = () => {
    this.syncWithWindow();
  };

  private emitChange() {
    const activeDisplay = cloneDisplay(this.getActiveDisplay());
    const payload: DisplayChangeDetail = {
      activeDisplay,
      displays: this.getDisplays(),
    };
    this.listeners.forEach((listener) => listener(payload));
  }

  private ensureActiveDisplay() {
    if (!this.displays.length) {
      this.displays = createFallbackDisplays();
    }
    if (!this.displays.some((display) => display.id === this.activeDisplayId)) {
      this.activeDisplayId = this.displays[0]?.id || DEFAULT_PRIMARY_ID;
    }
  }

  private syncWithWindow() {
    if (!this.autoDetect) return;
    const updated = readDisplaysFromWindow();
    this.setDisplays(updated);
  }

  getDisplays(): DisplayInfo[] {
    return this.displays.map(cloneDisplay);
  }

  getActiveDisplay(): DisplayInfo {
    this.ensureActiveDisplay();
    const display = this.displays.find((d) => d.id === this.activeDisplayId) || this.displays[0];
    return cloneDisplay(display);
  }

  setActiveDisplay(id: string) {
    if (id === this.activeDisplayId) return;
    if (!this.displays.some((display) => display.id === id)) return;
    this.activeDisplayId = id;
    this.emitChange();
  }

  setDisplays(displays: DisplayInfo[]) {
    this.displays = (displays && displays.length ? displays : createFallbackDisplays()).map(cloneDisplay);
    this.ensureActiveDisplay();
    this.emitChange();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener({ activeDisplay: this.getActiveDisplay(), displays: this.getDisplays() });
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const clampPositionToDisplay = (
  position: { x: number; y: number },
  size: WindowSize,
  display: DisplayInfo,
): { x: number; y: number } => {
  const width = Math.min(size.width, display.width);
  const height = Math.min(size.height, display.height);
  const maxX = display.left + display.width - width;
  const maxY = display.top + display.height - height;

  return {
    x: clamp(position.x, display.left, Math.max(display.left, maxX)),
    y: clamp(position.y, display.top, Math.max(display.top, maxY)),
  };
};

const getDefaultPercentages = (
  options: WindowPlacementOptions,
  display: DisplayInfo,
): { widthPercent: number; heightPercent: number } => {
  if (options.defaultWidth !== undefined && options.defaultHeight !== undefined) {
    return { widthPercent: options.defaultWidth, heightPercent: options.defaultHeight };
  }

  const isPortrait = display.height > display.width;
  if (isPortrait) {
    return { widthPercent: 90, heightPercent: 85 };
  }
  if (display.width < 640) {
    return { widthPercent: 85, heightPercent: 60 };
  }
  return { widthPercent: 60, heightPercent: 85 };
};

export const computeWindowPlacement = (
  display: DisplayInfo,
  options: WindowPlacementOptions,
): { position: { x: number; y: number }; size: WindowSize } => {
  const { widthPercent, heightPercent } = getDefaultPercentages(options, display);
  const width = (display.width * widthPercent) / 100;
  const height = (display.height * heightPercent) / 100;

  const isPortrait = display.height > display.width;
  const baseX = isPortrait
    ? display.left + display.width * 0.05
    : display.left + Math.min(60, display.width * 0.1);
  const baseY = display.top + 10;

  const desired = options.existingPosition ?? { x: baseX, y: baseY };
  const position = clampPositionToDisplay(desired, { width, height }, display);

  return { position, size: { width, height } };
};

export const displayManager = new DisplayManager();
