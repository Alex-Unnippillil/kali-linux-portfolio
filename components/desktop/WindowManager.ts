export type WindowVisibility = 'normal' | 'minimized' | 'maximized' | 'closed';

export interface WindowBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface WindowViewportInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface WindowSnapshot {
  bounds: WindowBounds;
  prevBounds: WindowBounds | null;
  visibility: WindowVisibility;
  viewportInsets: WindowViewportInsets;
  resumeVisibility: WindowVisibility;
}

type Listener = (snapshot: WindowSnapshot) => void;

const cloneBounds = (bounds: WindowBounds): WindowBounds => ({
  left: bounds.left,
  top: bounds.top,
  width: bounds.width,
  height: bounds.height,
});

const defaultInsets: WindowViewportInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

export interface MaximizeOptions {
  viewport: { width: number; height: number };
  topInset: number;
  taskbarInset: number;
  safeArea?: {
    bottom?: number;
    left?: number;
    right?: number;
  };
}

export default class WindowManager {
  private state: WindowSnapshot;

  private listeners: Set<Listener> = new Set();

  constructor(initialState?: Partial<WindowSnapshot>) {
    const bounds: WindowBounds = initialState?.bounds
      ? { ...initialState.bounds }
      : { left: 0, top: 0, width: 0, height: 0 };

    const visibility: WindowVisibility = initialState?.visibility ?? 'normal';

    this.state = {
      bounds,
      prevBounds: initialState?.prevBounds ? { ...initialState.prevBounds } : null,
      visibility,
      viewportInsets: initialState?.viewportInsets
        ? { ...initialState.viewportInsets }
        : { ...defaultInsets },
      resumeVisibility: initialState?.resumeVisibility ?? visibility,
    };
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): WindowSnapshot => this.state;

  getState(): WindowSnapshot {
    return this.state;
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private commit(next: Partial<WindowSnapshot>) {
    const current = this.state;
    this.state = {
      bounds: next.bounds ? { ...current.bounds, ...next.bounds } : { ...current.bounds },
      prevBounds:
        next.prevBounds === undefined
          ? current.prevBounds
            ? cloneBounds(current.prevBounds)
            : null
          : next.prevBounds
            ? cloneBounds(next.prevBounds)
            : null,
      visibility: next.visibility ?? current.visibility,
      viewportInsets: next.viewportInsets
        ? { ...next.viewportInsets }
        : { ...current.viewportInsets },
      resumeVisibility: next.resumeVisibility ?? current.resumeVisibility,
    };
    this.emit();
  }

  setBounds(bounds: Partial<WindowBounds>) {
    this.commit({ bounds: { ...bounds } });
  }

  open() {
    if (this.state.visibility === 'minimized') {
      const resume = this.state.resumeVisibility || 'normal';
      const insets = resume === 'maximized' ? { ...this.state.viewportInsets } : { ...defaultInsets };
      this.commit({ visibility: resume, viewportInsets: insets });
      return;
    }

    if (this.state.visibility === 'closed') {
      const fallback = this.state.prevBounds ? cloneBounds(this.state.prevBounds) : cloneBounds(this.state.bounds);
      this.commit({
        visibility: 'normal',
        bounds: fallback,
        prevBounds: null,
        viewportInsets: { ...defaultInsets },
        resumeVisibility: 'normal',
      });
    }
  }

  minimize() {
    const currentVisibility = this.state.visibility;
    if (currentVisibility === 'closed' || currentVisibility === 'minimized') {
      return;
    }
    this.commit({ visibility: 'minimized', resumeVisibility: currentVisibility });
  }

  close() {
    if (this.state.visibility === 'closed') return;
    this.commit({ visibility: 'closed', resumeVisibility: 'normal' });
  }

  maximize(options: MaximizeOptions) {
    const { viewport, topInset, taskbarInset, safeArea } = options;
    if (viewport.width <= 0 || viewport.height <= 0) {
      return;
    }

    const safeBottom = Math.max(0, safeArea?.bottom ?? 0);
    const safeLeft = Math.max(0, safeArea?.left ?? 0);
    const safeRight = Math.max(0, safeArea?.right ?? 0);
    const normalizedTop = Math.max(0, topInset);
    const normalizedTaskbar = Math.max(0, taskbarInset);

    const availableWidth = Math.max(viewport.width - safeLeft - safeRight, 0);
    const availableHeight = Math.max(viewport.height - normalizedTop - normalizedTaskbar - safeBottom, 0);

    const previousBounds = this.state.visibility === 'maximized' && this.state.prevBounds
      ? cloneBounds(this.state.prevBounds)
      : cloneBounds(this.state.bounds);

    this.commit({
      bounds: {
        left: safeLeft,
        top: normalizedTop,
        width: availableWidth,
        height: availableHeight,
      },
      prevBounds: previousBounds,
      visibility: 'maximized',
      viewportInsets: {
        top: normalizedTop,
        right: safeRight,
        bottom: normalizedTaskbar + safeBottom,
        left: safeLeft,
      },
      resumeVisibility: 'maximized',
    });
  }

  restore() {
    if (this.state.visibility !== 'maximized') {
      this.commit({ visibility: 'normal', resumeVisibility: 'normal', viewportInsets: { ...defaultInsets } });
      return;
    }

    const fallback = this.state.prevBounds ? cloneBounds(this.state.prevBounds) : cloneBounds(this.state.bounds);

    this.commit({
      bounds: fallback,
      prevBounds: null,
      visibility: 'normal',
      viewportInsets: { ...defaultInsets },
      resumeVisibility: 'normal',
    });
  }
}
