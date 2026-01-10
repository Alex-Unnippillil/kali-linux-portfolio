export const PEEK_EVENT_NAME = 'desktop:peek';

export type PeekOrigin = 'meta-hold' | 'three-finger-swipe';

export interface PeekEventDetail {
  active: boolean;
  origin: PeekOrigin;
}

type PeekListener = (detail: PeekEventDetail) => void;

type CleanupFn = () => void;

const noop = () => {};

type PeekWindow = Window & typeof globalThis;

const resolveWindow = (): PeekWindow | undefined => {
  if (typeof globalThis === 'undefined') {
    return undefined;
  }

  const candidate = (globalThis as { window?: PeekWindow }).window;
  return typeof candidate === 'undefined' ? undefined : candidate;
};

const createEvent = (detail: PeekEventDetail) =>
  new CustomEvent<PeekEventDetail>(PEEK_EVENT_NAME, { detail });

const dispatchPeekEvent = (detail: PeekEventDetail) => {
  const targetWindow = resolveWindow();
  if (!targetWindow) {
    return;
  }
  targetWindow.dispatchEvent(createEvent(detail));
};

export const addPeekStateListener = (listener: PeekListener): CleanupFn => {
  const targetWindow = resolveWindow();
  if (!targetWindow) {
    return noop;
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<PeekEventDetail>;
    listener(customEvent.detail);
  };

  targetWindow.addEventListener(PEEK_EVENT_NAME, handler as EventListener);

  return () => {
    targetWindow.removeEventListener(PEEK_EVENT_NAME, handler as EventListener);
  };
};

export interface PeekGestureOptions {
  holdDelay?: number;
  swipeThreshold?: number;
  target?: PeekWindow;
}

const DEFAULT_HOLD_DELAY = 250;
const DEFAULT_SWIPE_THRESHOLD = 70;

const averageTouchPoint = (touches: TouchList) => {
  let totalX = 0;
  let totalY = 0;
  const { length } = touches;

  for (let index = 0; index < length; index += 1) {
    const touch = touches.item(index);
    if (!touch) continue;
    totalX += touch.clientX;
    totalY += touch.clientY;
  }

  return {
    x: totalX / length,
    y: totalY / length,
  };
};

export const initializePeekGestures = (
  options: PeekGestureOptions = {},
): CleanupFn => {
  const targetWindow = options.target ?? resolveWindow();
  if (!targetWindow) {
    return noop;
  }

  const { holdDelay = DEFAULT_HOLD_DELAY, swipeThreshold = DEFAULT_SWIPE_THRESHOLD } = options;
  const doc = targetWindow.document;

  let metaTimer: ReturnType<typeof targetWindow.setTimeout> | null = null;
  let metaActive = false;
  let touchActive = false;
  let trackingTouch = false;
  let touchOrigin: { x: number; y: number } | null = null;

  const overallActive = () => metaActive || touchActive;

  const emitStateChange = (origin: PeekOrigin, active: boolean) => {
    const previouslyActive = overallActive();

    if (origin === 'meta-hold') {
      metaActive = active;
    } else {
      touchActive = active;
    }

    const nextActive = overallActive();

    if (previouslyActive !== nextActive) {
      dispatchPeekEvent({ active: nextActive, origin });
    }
  };

  const cancelMetaTimer = () => {
    if (metaTimer !== null) {
      targetWindow.clearTimeout(metaTimer);
      metaTimer = null;
    }
  };

  const cancelMetaPeek = () => {
    cancelMetaTimer();
    if (metaActive) {
      emitStateChange('meta-hold', false);
    }
  };

  const cancelTouchPeek = () => {
    trackingTouch = false;
    touchOrigin = null;
    if (touchActive) {
      emitStateChange('three-finger-swipe', false);
    }
  };

  const cancelAll = () => {
    cancelMetaPeek();
    cancelTouchPeek();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Meta' || metaTimer !== null || metaActive || event.repeat) {
      return;
    }

    metaTimer = targetWindow.setTimeout(() => {
      metaTimer = null;
      emitStateChange('meta-hold', true);
    }, holdDelay);
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (event.key !== 'Meta') {
      return;
    }
    cancelMetaPeek();
  };

  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length >= 3) {
      trackingTouch = true;
      touchOrigin = averageTouchPoint(event.touches);
    } else {
      cancelTouchPeek();
    }
  };

  const onTouchMove = (event: TouchEvent) => {
    if (!trackingTouch) {
      return;
    }

    if (event.touches.length < 3) {
      cancelTouchPeek();
      return;
    }

    if (!touchOrigin) {
      touchOrigin = averageTouchPoint(event.touches);
      return;
    }

    const current = averageTouchPoint(event.touches);
    const deltaX = current.x - touchOrigin.x;
    const deltaY = current.y - touchOrigin.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (!touchActive && distance >= swipeThreshold) {
      emitStateChange('three-finger-swipe', true);
    }
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (event.touches.length < 3) {
      cancelTouchPeek();
    }
  };

  const onVisibilityChange = () => {
    if (doc.hidden) {
      cancelAll();
    }
  };

  targetWindow.addEventListener('keydown', onKeyDown as EventListener);
  targetWindow.addEventListener('keyup', onKeyUp as EventListener);
  targetWindow.addEventListener('blur', cancelAll as EventListener);
  targetWindow.addEventListener('touchstart', onTouchStart as EventListener, { passive: true });
  targetWindow.addEventListener('touchmove', onTouchMove as EventListener, { passive: true });
  targetWindow.addEventListener('touchend', onTouchEnd as EventListener);
  targetWindow.addEventListener('touchcancel', cancelTouchPeek as EventListener);
  doc.addEventListener('visibilitychange', onVisibilityChange);

  const cleanup = () => {
    cancelAll();
    targetWindow.removeEventListener('keydown', onKeyDown as EventListener);
    targetWindow.removeEventListener('keyup', onKeyUp as EventListener);
    targetWindow.removeEventListener('blur', cancelAll as EventListener);
    targetWindow.removeEventListener('touchstart', onTouchStart as EventListener);
    targetWindow.removeEventListener('touchmove', onTouchMove as EventListener);
    targetWindow.removeEventListener('touchend', onTouchEnd as EventListener);
    targetWindow.removeEventListener('touchcancel', cancelTouchPeek as EventListener);
    doc.removeEventListener('visibilitychange', onVisibilityChange);
  };

  return cleanup;
};
