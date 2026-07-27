export type SoftKeyboardMode = 'docked' | 'floating';

export const SOFT_KEYBOARD_FRAME_EVENT = 'soft-keyboard:frame';
export const SOFT_KEYBOARD_HIDE_EVENT = 'soft-keyboard:hide';
export const SOFT_KEYBOARD_PRESS_EVENT = 'soft-keyboard:press';

export interface KeyboardRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface SoftKeyboardFrameDetail {
  mode: SoftKeyboardMode;
  rect: KeyboardRect;
}

export interface SoftKeyboardPressDetail {
  key: string;
}

export interface WindowPlacement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DesktopMetrics {
  width: number;
  height: number;
}

type Direction = 'top' | 'bottom' | 'left' | 'right';
type Axis = 'x' | 'y';

interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

interface Candidate {
  axis: Axis;
  value: number;
  distance: number;
  penalty: number;
  axisPriority: number;
  directionPriority: number;
}

const DEFAULT_MARGIN = 16;

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const resolveViewport = (viewport?: DesktopMetrics): DesktopMetrics => {
  if (viewport) return viewport;
  if (typeof window !== 'undefined') {
    return { width: window.innerWidth, height: window.innerHeight };
  }
  return {
    width: Number.POSITIVE_INFINITY,
    height: Number.POSITIVE_INFINITY,
  };
};

const normaliseRect = (rect: KeyboardRect): Rect => {
  const left = rect.left ?? rect.x;
  const top = rect.top ?? rect.y;
  const width = rect.width ?? Math.max(0, rect.right - left);
  const height = rect.height ?? Math.max(0, rect.bottom - top);
  const right = rect.right ?? left + width;
  const bottom = rect.bottom ?? top + height;

  return { top, bottom, left, right, width, height };
};

const intersects = (win: WindowPlacement, rect: Rect) => {
  return (
    win.x < rect.right &&
    win.x + win.width > rect.left &&
    win.y < rect.bottom &&
    win.y + win.height > rect.top
  );
};

const axisLimit = (size: number, viewportSize: number) => {
  if (!Number.isFinite(viewportSize)) return Number.POSITIVE_INFINITY;
  return Math.max(0, viewportSize - size);
};

const directionPriority = (direction: Direction): number => {
  switch (direction) {
    case 'top':
      return 0;
    case 'bottom':
      return 1;
    case 'left':
      return 0;
    case 'right':
    default:
      return 1;
  }
};

const axisPreference = (axis: Axis, mode: SoftKeyboardMode) => {
  if (mode === 'docked') {
    return axis === 'y' ? 0 : 1;
  }
  return axis === 'x' ? 0 : 1;
};

const createCandidate = (
  direction: Direction,
  target: number,
  axis: Axis,
  axisMax: number,
  base: number,
  margin: number,
  win: WindowPlacement,
  rect: Rect,
  mode: SoftKeyboardMode
): Candidate => {
  const value = clamp(target, 0, axisMax);

  let gap: number;
  if (direction === 'top') {
    gap = rect.top - (value + win.height);
  } else if (direction === 'bottom') {
    gap = value - rect.bottom;
  } else if (direction === 'left') {
    gap = rect.left - (value + win.width);
  } else {
    gap = value - rect.right;
  }

  const penalty = gap >= margin ? 0 : margin - gap;

  return {
    axis,
    value,
    distance: Math.abs(value - base),
    penalty,
    axisPriority: axisPreference(axis, mode),
    directionPriority: directionPriority(direction),
  };
};

const sortCandidates = (a: Candidate, b: Candidate) => {
  if (a.penalty !== b.penalty) return a.penalty - b.penalty;
  if (a.axisPriority !== b.axisPriority) return a.axisPriority - b.axisPriority;
  if (a.directionPriority !== b.directionPriority) {
    return a.directionPriority - b.directionPriority;
  }
  return a.distance - b.distance;
};

const ensureWithinViewport = (
  value: number,
  axisMax: number
) => clamp(value, 0, axisMax);

/**
 * Repositions windows when a soft keyboard would cover them.
 *
 * The function favours the smallest adjustment that keeps a window clear of the
 * keyboard, prioritising vertical movement for docked keyboards and lateral
 * movement for floating keyboards.
 */
export const repositionWindowsForKeyboard = (
  windows: readonly WindowPlacement[],
  keyboard: SoftKeyboardFrameDetail | null | undefined,
  viewport?: DesktopMetrics,
  margin = DEFAULT_MARGIN
): WindowPlacement[] => {
  const metrics = resolveViewport(viewport);
  const keyboardRect = keyboard ? normaliseRect(keyboard.rect) : null;

  return windows.map((win) => {
    const maxX = axisLimit(win.width, metrics.width);
    const maxY = axisLimit(win.height, metrics.height);
    const next: WindowPlacement = {
      ...win,
      x: ensureWithinViewport(win.x, maxX),
      y: ensureWithinViewport(win.y, maxY),
    };

    if (!keyboard || !keyboardRect) {
      return next;
    }

    if (!intersects(next, keyboardRect)) {
      return next;
    }

    const winRight = next.x + next.width;
    const winBottom = next.y + next.height;
    const horizontalOverlap =
      Math.min(winRight, keyboardRect.right) - Math.max(next.x, keyboardRect.left);
    const verticalOverlap =
      Math.min(winBottom, keyboardRect.bottom) - Math.max(next.y, keyboardRect.top);

    if (horizontalOverlap <= 0 || verticalOverlap <= 0) {
      return next;
    }

    const overlapMargin = Math.max(0, margin);
    const verticalShift = verticalOverlap + overlapMargin;
    const horizontalShift = horizontalOverlap + overlapMargin;

    const candidates: Candidate[] = [
      createCandidate(
        'top',
        next.y - verticalShift,
        'y',
        maxY,
        next.y,
        overlapMargin,
        next,
        keyboardRect,
        keyboard.mode
      ),
      createCandidate(
        'bottom',
        next.y + verticalShift,
        'y',
        maxY,
        next.y,
        overlapMargin,
        next,
        keyboardRect,
        keyboard.mode
      ),
      createCandidate(
        'left',
        next.x - horizontalShift,
        'x',
        maxX,
        next.x,
        overlapMargin,
        next,
        keyboardRect,
        keyboard.mode
      ),
      createCandidate(
        'right',
        next.x + horizontalShift,
        'x',
        maxX,
        next.x,
        overlapMargin,
        next,
        keyboardRect,
        keyboard.mode
      ),
    ];

    candidates.sort(sortCandidates);
    const choice = candidates[0];

    if (choice.axis === 'y') {
      next.y = ensureWithinViewport(choice.value, maxY);
    } else {
      next.x = ensureWithinViewport(choice.value, maxX);
    }

    return next;
  });
};

export const KEYBOARD_AVOIDANCE_MARGIN = DEFAULT_MARGIN;
