import { isBrowser } from '../../utils/isBrowser';

const HOT_CORNER_IDS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;

export type HotCornerId = (typeof HOT_CORNER_IDS)[number];

export interface HotCornerRegistration {
  corner: HotCornerId;
  action: () => void;
  dwellMs?: number;
}

export interface HotCornerActionConfig {
  action: () => void;
  dwellMs?: number;
}

export type HotCornerActionsConfig = Partial<Record<HotCornerId, HotCornerActionConfig | undefined>>;

export interface HotCornerManagerOptions {
  dwellMs?: number;
  cornerSize?: number;
}

interface CornerAction {
  handler: () => void;
  dwellMs: number;
}

const DEFAULT_DWELL = 250;
const DEFAULT_CORNER_SIZE = 80;

type TimeoutHandle = ReturnType<typeof setTimeout>;

class HotCornerManager {
  private actions: Partial<Record<HotCornerId, CornerAction>> = {};
  private timers: Partial<Record<HotCornerId, TimeoutHandle>> = {};
  private activeCorner: HotCornerId | null = null;
  private triggeredCorners: Set<HotCornerId> = new Set();
  private listening = false;
  private defaultDwell = DEFAULT_DWELL;
  private cornerSize = DEFAULT_CORNER_SIZE;
  private lastPoint: { x: number; y: number } | null = null;

  private handlePointerMove = (event: PointerEvent) => {
    this.processPoint(event.clientX, event.clientY);
  };

  private handlePointerLeave = () => {
    this.resetActiveCorner();
  };

  private handleWindowBlur = () => {
    this.resetActiveCorner();
  };

  private handleVisibilityChange = () => {
    if (!isBrowser || typeof document === 'undefined') {
      return;
    }
    if (document.visibilityState !== 'visible') {
      this.resetActiveCorner();
    }
  };

  register(config: HotCornerRegistration) {
    const { corner, action, dwellMs } = config;
    return this.setAction(corner, action, dwellMs);
  }

  setAction(corner: HotCornerId, action?: () => void, dwellMs?: number) {
    const previous = this.actions[corner];
    if (!action) {
      delete this.actions[corner];
      this.resetCorner(corner);
      this.refreshListeners();
      return () => {
        if (previous) {
          this.actions[corner] = previous;
          this.refreshListeners();
        }
      };
    }

    const entry: CornerAction = {
      handler: action,
      dwellMs: typeof dwellMs === 'number' ? dwellMs : this.defaultDwell,
    };

    this.actions[corner] = entry;
    this.resetCorner(corner);
    this.refreshListeners();

    return () => {
      if (previous) {
        this.actions[corner] = previous;
      } else {
        delete this.actions[corner];
      }
      this.resetCorner(corner);
      this.refreshListeners();
    };
  }

  setActions(config: HotCornerActionsConfig, options?: HotCornerManagerOptions) {
    const previousActions: Partial<Record<HotCornerId, CornerAction>> = {};
    HOT_CORNER_IDS.forEach((corner) => {
      const prev = this.actions[corner];
      if (prev) {
        previousActions[corner] = { ...prev };
      }
    });
    const previousOptions = {
      defaultDwell: this.defaultDwell,
      cornerSize: this.cornerSize,
    };

    if (options?.dwellMs !== undefined) {
      this.defaultDwell = options.dwellMs;
    }
    if (options?.cornerSize !== undefined) {
      this.cornerSize = options.cornerSize;
    }

    this.actions = {};
    HOT_CORNER_IDS.forEach((corner) => {
      const entry = config[corner];
      if (entry?.action) {
        this.actions[corner] = {
          handler: entry.action,
          dwellMs: entry.dwellMs ?? this.defaultDwell,
        };
      }
      this.resetCorner(corner);
    });
    this.refreshListeners();

    return () => {
      this.actions = {};
      HOT_CORNER_IDS.forEach((corner) => {
        const prev = previousActions[corner];
        if (prev) {
          this.actions[corner] = prev;
        }
      });
      this.defaultDwell = previousOptions.defaultDwell;
      this.cornerSize = previousOptions.cornerSize;
      this.resetActiveCorner();
      this.refreshListeners();
    };
  }

  triggerCorner(corner: HotCornerId) {
    const entry = this.actions[corner];
    if (!entry || !isBrowser) {
      return false;
    }
    this.clearTimer(corner);
    this.triggeredCorners.add(corner);
    entry.handler();
    return true;
  }

  getAction(corner: HotCornerId): HotCornerActionConfig | undefined {
    const entry = this.actions[corner];
    if (!entry) return undefined;
    return { action: entry.handler, dwellMs: entry.dwellMs };
  }

  private processPoint(x: number, y: number) {
    if (!this.listening || !isBrowser) return;
    this.lastPoint = { x, y };
    const corner = this.detectCorner(x, y);
    if (!corner) {
      if (this.activeCorner) {
        this.resetCorner(this.activeCorner);
        this.activeCorner = null;
      }
      return;
    }

    if (!this.actions[corner]) {
      if (this.activeCorner && this.activeCorner !== corner) {
        this.resetCorner(this.activeCorner);
        this.activeCorner = null;
      }
      return;
    }

    if (this.activeCorner !== corner) {
      if (this.activeCorner) {
        this.resetCorner(this.activeCorner);
      }
      this.activeCorner = corner;
      this.scheduleCorner(corner);
    }
  }

  private detectCorner(x: number, y: number): HotCornerId | null {
    if (!isBrowser) return null;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const size = this.cornerSize;

    if (x <= size && y <= size) return 'top-left';
    if (x >= width - size && y <= size) return 'top-right';
    if (x <= size && y >= height - size) return 'bottom-left';
    if (x >= width - size && y >= height - size) return 'bottom-right';
    return null;
  }

  private scheduleCorner(corner: HotCornerId) {
    if (!isBrowser) return;
    const entry = this.actions[corner];
    if (!entry || this.triggeredCorners.has(corner)) return;
    this.clearTimer(corner);
    this.timers[corner] = setTimeout(() => {
      if (this.activeCorner !== corner) return;
      if (this.lastPoint) {
        const stillCorner = this.detectCorner(this.lastPoint.x, this.lastPoint.y);
        if (stillCorner !== corner) {
          return;
        }
      }
      this.triggeredCorners.add(corner);
      entry.handler();
    }, entry.dwellMs);
  }

  private clearTimer(corner: HotCornerId) {
    const timer = this.timers[corner];
    if (timer !== undefined) {
      clearTimeout(timer);
      delete this.timers[corner];
    }
  }

  private resetCorner(corner: HotCornerId) {
    this.clearTimer(corner);
    this.triggeredCorners.delete(corner);
    if (this.activeCorner === corner) {
      this.activeCorner = null;
    }
  }

  private resetActiveCorner() {
    if (this.activeCorner) {
      this.resetCorner(this.activeCorner);
    }
    this.lastPoint = null;
  }

  private ensureListening() {
    if (this.listening || !isBrowser) return;
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', this.handlePointerMove, { passive: true });
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('resize', this.handleWindowBlur);
    document.addEventListener('pointerleave', this.handlePointerLeave);
    document.addEventListener('mouseleave', this.handlePointerLeave);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.listening = true;
  }

  private stopListening() {
    if (!this.listening || !isBrowser) return;
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerdown', this.handlePointerMove);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('resize', this.handleWindowBlur);
    document.removeEventListener('pointerleave', this.handlePointerLeave);
    document.removeEventListener('mouseleave', this.handlePointerLeave);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.listening = false;
    this.resetActiveCorner();
  }

  private refreshListeners() {
    const hasActions = HOT_CORNER_IDS.some((corner) => Boolean(this.actions[corner]));
    if (hasActions) {
      this.ensureListening();
    } else {
      this.stopListening();
    }
  }
}

const manager = new HotCornerManager();

export function registerHotCorner(config: HotCornerRegistration) {
  return manager.register(config);
}

export function setHotCornerAction(corner: HotCornerId, action?: () => void, options?: { dwellMs?: number }) {
  return manager.setAction(corner, action, options?.dwellMs);
}

export function setHotCornerActions(config: HotCornerActionsConfig, options?: HotCornerManagerOptions) {
  return manager.setActions(config, options);
}

export function triggerHotCorner(corner: HotCornerId) {
  return manager.triggerCorner(corner);
}

export function getHotCornerAction(corner: HotCornerId) {
  return manager.getAction(corner);
}

export const HOT_CORNERS = HOT_CORNER_IDS;
