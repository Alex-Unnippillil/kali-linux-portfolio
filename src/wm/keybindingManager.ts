export type HorizontalEdge = 'left' | 'right';
export type VerticalEdge = 'top' | 'bottom';
export type Edge = HorizontalEdge | VerticalEdge;
export type Axis = 'horizontal' | 'vertical';

export interface WindowFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface KeyboardResizeState {
  edge: Edge;
  axis: Axis;
  announcement: string;
}

export interface WindowState extends WindowFrame {
  keyboardResize?: KeyboardResizeState | null;
  keyboardResizeEdge?: Edge;
  keyboardResizeAxis?: Axis;
  keyboardResizeAnnouncement?: string;
  [key: string]: unknown;
}

export interface KeybindingEventLike {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  preventDefault?: () => void;
  stopPropagation?: () => void;
}

export interface KeybindingManagerConfig {
  viewport: { width: number; height: number };
  step?: number;
  minWidth?: number;
  minHeight?: number;
  announce?: (message: string) => void;
}

export interface KeybindingResult {
  handled: boolean;
  state: WindowState;
  announcement?: string;
}

const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
const DEFAULT_STEP = 16;
const DEFAULT_MIN_WIDTH = 160;
const DEFAULT_MIN_HEIGHT = 120;

function clamp(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function titleCase(edge: Edge) {
  return edge.charAt(0).toUpperCase() + edge.slice(1);
}

function cloneFrame(frame: WindowFrame): WindowFrame {
  return {
    left: frame.left,
    top: frame.top,
    width: frame.width,
    height: frame.height,
  };
}

export class KeybindingManager {
  private readonly viewport: { width: number; height: number };
  private readonly step: number;
  private readonly minWidth: number;
  private readonly minHeight: number;
  private readonly announce?: (message: string) => void;

  constructor(config: KeybindingManagerConfig) {
    this.viewport = config.viewport;
    this.step = Math.max(1, config.step ?? DEFAULT_STEP);
    this.minWidth = Math.max(1, config.minWidth ?? DEFAULT_MIN_WIDTH);
    this.minHeight = Math.max(1, config.minHeight ?? DEFAULT_MIN_HEIGHT);
    this.announce = config.announce;
  }

  handle(event: KeybindingEventLike, state: WindowState): KeybindingResult {
    if (!this.shouldHandle(event)) {
      return { handled: false, state };
    }

    const axis = this.getAxis(event.key);
    if (!axis) {
      return { handled: false, state };
    }

    const delta = this.getDelta(event.key);
    const frame = cloneFrame(state);

    const edge =
      axis === 'horizontal'
        ? this.getNearestHorizontalEdge(state)
        : this.getNearestVerticalEdge(state);

    const nextFrame =
      axis === 'horizontal'
        ? this.applyHorizontalResize(frame, edge as HorizontalEdge, delta)
        : this.applyVerticalResize(frame, edge as VerticalEdge, delta);

    const announcement = this.buildAnnouncement(edge, frame, nextFrame, axis);

    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
    if (this.announce) this.announce(announcement);

    const {
      keyboardResize: _keyboardResize,
      keyboardResizeEdge: _keyboardResizeEdge,
      keyboardResizeAxis: _keyboardResizeAxis,
      keyboardResizeAnnouncement: _keyboardResizeAnnouncement,
      ...rest
    } = state;

    const nextState: WindowState = {
      ...rest,
      ...nextFrame,
      keyboardResize: {
        edge,
        axis,
        announcement,
      },
      keyboardResizeEdge: edge,
      keyboardResizeAxis: axis,
      keyboardResizeAnnouncement: announcement,
    };

    return {
      handled: true,
      state: nextState,
      announcement,
    };
  }

  private shouldHandle(event: KeybindingEventLike) {
    if (!event.altKey || !ARROW_KEYS.has(event.key)) {
      return false;
    }
    if (event.metaKey || event.ctrlKey) {
      return false;
    }
    return true;
  }

  private getAxis(key: string): Axis | null {
    if (key === 'ArrowLeft' || key === 'ArrowRight') return 'horizontal';
    if (key === 'ArrowUp' || key === 'ArrowDown') return 'vertical';
    return null;
  }

  private getDelta(key: string) {
    return key === 'ArrowLeft' || key === 'ArrowUp' ? -this.step : this.step;
  }

  private getNearestHorizontalEdge(state: WindowState): HorizontalEdge {
    const leftDistance = Math.max(0, state.left);
    const rightDistance = Math.max(
      0,
      this.viewport.width - (state.left + state.width),
    );

    if (leftDistance === rightDistance) {
      const previous = state.keyboardResize?.edge ?? state.keyboardResizeEdge;
      if (previous === 'left' || previous === 'right') {
        return previous;
      }
      return 'left';
    }

    return leftDistance <= rightDistance ? 'left' : 'right';
  }

  private getNearestVerticalEdge(state: WindowState): VerticalEdge {
    const topDistance = Math.max(0, state.top);
    const bottomDistance = Math.max(
      0,
      this.viewport.height - (state.top + state.height),
    );

    if (topDistance === bottomDistance) {
      const previous = state.keyboardResize?.edge ?? state.keyboardResizeEdge;
      if (previous === 'top' || previous === 'bottom') {
        return previous;
      }
      return 'top';
    }

    return topDistance <= bottomDistance ? 'top' : 'bottom';
  }

  private applyHorizontalResize(
    frame: WindowFrame,
    edge: HorizontalEdge,
    delta: number,
  ): WindowFrame {
    const left = frame.left;
    const right = frame.left + frame.width;

    if (edge === 'left') {
      const maxLeft = Math.min(
        Math.max(0, right - this.minWidth),
        Math.max(0, this.viewport.width - this.minWidth),
      );
      const nextLeft = clamp(left + delta, 0, maxLeft);
      const nextWidth = Math.max(this.minWidth, right - nextLeft);
      return {
        ...frame,
        left: nextLeft,
        width: nextWidth,
      };
    }

    const minRight = Math.max(left + this.minWidth, this.minWidth);
    const maxRight = Math.max(minRight, this.viewport.width);
    const nextRight = clamp(right + delta, minRight, maxRight);
    const nextWidth = Math.max(this.minWidth, nextRight - left);

    return {
      ...frame,
      width: nextWidth,
    };
  }

  private applyVerticalResize(
    frame: WindowFrame,
    edge: VerticalEdge,
    delta: number,
  ): WindowFrame {
    const top = frame.top;
    const bottom = frame.top + frame.height;

    if (edge === 'top') {
      const maxTop = Math.min(
        Math.max(0, bottom - this.minHeight),
        Math.max(0, this.viewport.height - this.minHeight),
      );
      const nextTop = clamp(top + delta, 0, maxTop);
      const nextHeight = Math.max(this.minHeight, bottom - nextTop);
      return {
        ...frame,
        top: nextTop,
        height: nextHeight,
      };
    }

    const minBottom = Math.max(top + this.minHeight, this.minHeight);
    const maxBottom = Math.max(minBottom, this.viewport.height);
    const nextBottom = clamp(bottom + delta, minBottom, maxBottom);
    const nextHeight = Math.max(this.minHeight, nextBottom - top);

    return {
      ...frame,
      height: nextHeight,
    };
  }

  private buildAnnouncement(
    edge: Edge,
    previous: WindowFrame,
    next: WindowFrame,
    axis: Axis,
  ) {
    const coordinate = this.getEdgeCoordinate(edge, next);
    const roundedCoordinate = Math.round(coordinate);
    const size = axis === 'horizontal' ? next.width : next.height;
    const roundedSize = Math.round(size);
    const unchanged = this.isUnchanged(edge, previous, next);

    const base = `${titleCase(edge)} edge at ${roundedCoordinate}px`;
    const sizeText = axis === 'horizontal'
      ? `width ${roundedSize}px`
      : `height ${roundedSize}px`;

    if (unchanged) {
      return `${base}, ${sizeText} (limit reached)`;
    }

    return `${base}, ${sizeText}`;
  }

  private getEdgeCoordinate(edge: Edge, frame: WindowFrame) {
    switch (edge) {
      case 'left':
        return frame.left;
      case 'right':
        return frame.left + frame.width;
      case 'top':
        return frame.top;
      case 'bottom':
        return frame.top + frame.height;
      default:
        return 0;
    }
  }

  private isUnchanged(edge: Edge, previous: WindowFrame, next: WindowFrame) {
    if (edge === 'left' || edge === 'right') {
      return previous.width === next.width;
    }
    return previous.height === next.height;
  }
}

export default KeybindingManager;
