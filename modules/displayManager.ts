export interface DisplayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DisplayInfo {
  id: string;
  label: string;
  isPrimary: boolean;
  scaleFactor: number;
  bounds: DisplayBounds;
}

export interface Position {
  x: number;
  y: number;
}

interface DisplaySnapshot {
  displays: DisplayInfo[];
  activeDisplayId: string;
}

type DisplayListener = (snapshot: DisplaySnapshot) => void;

const DEFAULT_PRIMARY: DisplayInfo = {
  id: 'primary',
  label: 'Primary Display',
  isPrimary: true,
  scaleFactor: 1,
  bounds: { x: 0, y: 0, width: 1440, height: 900 },
};

const DEFAULT_SECONDARY: DisplayInfo = {
  id: 'secondary',
  label: 'External Display',
  isPrimary: false,
  scaleFactor: 1,
  bounds: { x: 0, y: 0, width: 1280, height: 800 },
};

const SAFE_MARGIN = 48;

const cloneDisplay = (display: DisplayInfo): DisplayInfo => ({
  ...display,
  bounds: { ...display.bounds },
});

class DisplayManager {
  private displays: DisplayInfo[] = [cloneDisplay(DEFAULT_PRIMARY), cloneDisplay(DEFAULT_SECONDARY)];
  private activeDisplayId: string = 'primary';
  private listeners: Set<DisplayListener> = new Set();

  constructor() {
    this.displays = this.detectDisplays();
    this.activeDisplayId =
      this.displays.find((display) => display.isPrimary)?.id || this.displays[0]?.id || 'primary';

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize);
    }
  }

  private handleResize = () => {
    this.displays = this.detectDisplays();
    if (!this.displays.some((display) => display.id === this.activeDisplayId)) {
      this.activeDisplayId = this.displays[0]?.id || 'primary';
    }
    this.notify();
  };

  private detectDisplays(): DisplayInfo[] {
    if (typeof window === 'undefined') {
      return [cloneDisplay(DEFAULT_PRIMARY), cloneDisplay(DEFAULT_SECONDARY)];
    }

    const screenWidth = window.screen?.width ?? 0;
    const screenHeight = window.screen?.height ?? 0;
    const width = Math.max(window.innerWidth, screenWidth, DEFAULT_PRIMARY.bounds.width);
    const height = Math.max(window.innerHeight, screenHeight, DEFAULT_PRIMARY.bounds.height);
    const scaleFactor = window.devicePixelRatio || 1;

    const secondaryWidth = Math.max(Math.round(width * 0.75), 960);
    const secondaryHeight = Math.max(Math.round(height * 0.75), 720);

    return [
      {
        id: 'primary',
        label: 'Primary Display',
        isPrimary: true,
        scaleFactor,
        bounds: { x: 0, y: 0, width, height },
      },
      {
        id: 'secondary',
        label: 'External Display',
        isPrimary: false,
        scaleFactor,
        bounds: { x: 0, y: 0, width: secondaryWidth, height: secondaryHeight },
      },
    ];
  }

  private notify() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private getSnapshot(): DisplaySnapshot {
    return {
      activeDisplayId: this.activeDisplayId,
      displays: this.displays.map(cloneDisplay),
    };
  }

  getDisplays(): DisplayInfo[] {
    return this.displays.map(cloneDisplay);
  }

  getActiveDisplayId(): string {
    return this.activeDisplayId;
  }

  getDisplay(id?: string): DisplayInfo | undefined {
    const targetId = id ?? this.activeDisplayId;
    const display = this.displays.find((item) => item.id === targetId);
    return display ? cloneDisplay(display) : undefined;
  }

  setActiveDisplay(id: string): void {
    if (id === this.activeDisplayId) return;
    if (!this.displays.some((display) => display.id === id)) return;
    this.activeDisplayId = id;
    this.notify();
  }

  subscribe(listener: DisplayListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  clampPosition(position: Position, options: { displayId?: string; margin?: number } = {}): Position {
    const display = this.getDisplay(options.displayId) ?? cloneDisplay(DEFAULT_PRIMARY);
    const margin = Math.max(0, options.margin ?? SAFE_MARGIN);
    const { x: originX, y: originY, width, height } = display.bounds;

    const effectiveMarginX = Math.min(margin, width / 2);
    const effectiveMarginY = Math.min(margin, height / 2);

    const minX = originX + effectiveMarginX;
    const maxX = originX + width - effectiveMarginX;
    const minY = originY + effectiveMarginY;
    const maxY = originY + height - effectiveMarginY;

    const nextX =
      width <= effectiveMarginX * 2
        ? originX + width / 2
        : Math.min(Math.max(position.x, minX), maxX);
    const nextY =
      height <= effectiveMarginY * 2
        ? originY + height / 2
        : Math.min(Math.max(position.y, minY), maxY);

    return { x: nextX, y: nextY };
  }

  clampWindowMap(
    positions: Record<string, Position | undefined>,
    options: { displayId?: string; margin?: number } = {}
  ): Record<string, Position> {
    const result: Record<string, Position> = {};
    Object.entries(positions || {}).forEach(([id, value]) => {
      if (!value) return;
      result[id] = this.clampPosition(value, options);
    });
    return result;
  }

  getCascadePosition(index: number, options: { displayId?: string; margin?: number } = {}): Position {
    const display = this.getDisplay(options.displayId) ?? cloneDisplay(DEFAULT_PRIMARY);
    const margin = Math.max(0, options.margin ?? SAFE_MARGIN);
    const step = 32;
    const x = display.bounds.x + margin + index * step;
    const y = display.bounds.y + margin + index * step;
    return this.clampPosition({ x, y }, { displayId: display.id, margin });
  }

  setVirtualDisplays(displays: DisplayInfo[], activeId?: string): void {
    if (!displays.length) {
      this.displays = [cloneDisplay(DEFAULT_PRIMARY)];
      this.activeDisplayId = 'primary';
      this.notify();
      return;
    }
    this.displays = displays.map(cloneDisplay);
    if (activeId && this.displays.some((display) => display.id === activeId)) {
      this.activeDisplayId = activeId;
    } else if (!this.displays.some((display) => display.id === this.activeDisplayId)) {
      this.activeDisplayId = this.displays[0].id;
    }
    this.notify();
  }
}

const displayManager = new DisplayManager();

export default displayManager;
export { SAFE_MARGIN };
