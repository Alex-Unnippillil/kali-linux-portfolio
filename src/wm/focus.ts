const FOCUS_DWELL_DELAY_MS = 350;

export const HOVER_DWELL_DELAY_MS = FOCUS_DWELL_DELAY_MS;

type FocusPreferenceListener = (enabled: boolean) => void;

let focusFollowsMouseEnabled = false;
const preferenceListeners = new Set<FocusPreferenceListener>();

export function isFocusFollowsMouseEnabled(): boolean {
  return focusFollowsMouseEnabled;
}

export function setFocusFollowsMouseEnabled(enabled: boolean) {
  if (focusFollowsMouseEnabled === enabled) return;
  focusFollowsMouseEnabled = enabled;
  preferenceListeners.forEach((listener) => {
    listener(enabled);
  });
}

export function subscribeFocusFollowsMouse(
  listener: FocusPreferenceListener
): () => void {
  preferenceListeners.add(listener);
  listener(focusFollowsMouseEnabled);
  return () => {
    preferenceListeners.delete(listener);
  };
}

export function attachFocusOnHover(
  element: HTMLElement | null,
  onFocus: () => void,
  dwellMs: number = FOCUS_DWELL_DELAY_MS
): () => void {
  if (!element || typeof window === 'undefined') {
    return () => {};
  }

  let hoverTimer: number | null = null;
  let pointerInside = false;

  const clearHoverTimer = () => {
    if (hoverTimer !== null) {
      window.clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  };

  const scheduleFocus = () => {
    if (!focusFollowsMouseEnabled || hoverTimer !== null) {
      return;
    }
    hoverTimer = window.setTimeout(() => {
      hoverTimer = null;
      if (pointerInside && focusFollowsMouseEnabled) {
        onFocus();
      }
    }, dwellMs);
  };

  const handlePointerEnter = () => {
    pointerInside = true;
    scheduleFocus();
  };

  const handlePointerLeave = () => {
    pointerInside = false;
    clearHoverTimer();
  };

  const handlePointerDown = () => {
    pointerInside = false;
    clearHoverTimer();
  };

  element.addEventListener('pointerenter', handlePointerEnter);
  element.addEventListener('pointerleave', handlePointerLeave);
  element.addEventListener('pointercancel', handlePointerLeave);
  element.addEventListener('pointerdown', handlePointerDown);

  const unsubscribe = subscribeFocusFollowsMouse((enabled) => {
    if (!enabled) {
      clearHoverTimer();
    } else if (pointerInside) {
      scheduleFocus();
    }
  });

  return () => {
    clearHoverTimer();
    unsubscribe();
    element.removeEventListener('pointerenter', handlePointerEnter);
    element.removeEventListener('pointerleave', handlePointerLeave);
    element.removeEventListener('pointercancel', handlePointerLeave);
    element.removeEventListener('pointerdown', handlePointerDown);
  };
}
