/**
 * Shared viewport policy for the desktop shell.
 *
 * Presentation is deliberately derived from the stable layout viewport. The
 * visual viewport is transient (browser controls and the software keyboard
 * resize it), so it is only used to describe the currently visible work area.
 */
export const COMPACT_PHONE_WIDTH = 640;
export const COMPACT_PHONE_LANDSCAPE_WIDTH = 1024;
export const COMPACT_PHONE_LANDSCAPE_HEIGHT = 500;

const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

const mediaMatches = (target, query) => {
  try {
    return Boolean(target?.matchMedia?.(query)?.matches);
  } catch {
    return false;
  }
};

export function isCompactWindowViewport(width, height, coarse = false) {
  return width > 0 && (
    width < COMPACT_PHONE_WIDTH
    || (coarse && width < COMPACT_PHONE_LANDSCAPE_WIDTH && height < COMPACT_PHONE_LANDSCAPE_HEIGHT)
  );
}

export function getLayoutViewport(target = typeof window !== 'undefined' ? window : undefined) {
  const documentElement = target?.document?.documentElement;
  return {
    width: finite(target?.innerWidth, finite(documentElement?.clientWidth)),
    height: finite(target?.innerHeight, finite(documentElement?.clientHeight)),
  };
}

/** Input capabilities are independent flags; hybrid machines can expose all of them. */
export function getInputCapabilities(target = typeof window !== 'undefined' ? window : undefined) {
  const coarsePointer = mediaMatches(target, '(any-pointer: coarse)');
  const finePointer = mediaMatches(target, '(any-pointer: fine)');
  const hover = mediaMatches(target, '(any-hover: hover)');
  // The platform has no keyboard media feature. A fine/hover device is assumed
  // keyboard-capable, while VirtualKeyboard or keyboard APIs are direct signals.
  const keyboard = Boolean(target?.navigator?.keyboard || target?.navigator?.virtualKeyboard || finePointer || hover);
  return {
    coarsePointer,
    finePointer,
    hover,
    keyboard,
    hybrid: coarsePointer && (finePointer || hover || keyboard),
  };
}

export function getWorkingArea(
  target = typeof window !== 'undefined' ? window : undefined,
  safeArea = {},
) {
  const layout = getLayoutViewport(target);
  const visual = target?.visualViewport;
  const left = finite(visual?.offsetLeft);
  const top = finite(visual?.offsetTop);
  const width = finite(visual?.width, layout.width) || layout.width;
  const height = finite(visual?.height, layout.height) || layout.height;
  const obstruction = {
    top: Math.max(0, top),
    left: Math.max(0, left),
    right: Math.max(0, layout.width - width - left),
    bottom: Math.max(0, layout.height - height - top),
  };
  const keyboardRect = target?.navigator?.virtualKeyboard?.boundingRect;
  const activeElement = target?.document?.activeElement;
  const editableFocused = Boolean(activeElement && (
    /^(INPUT|TEXTAREA|SELECT)$/.test(activeElement.tagName)
    || activeElement.isContentEditable
  ));
  const keyboardHeight = Math.max(
    0,
    finite(keyboardRect?.height),
    editableFocused ? obstruction.bottom : 0,
  );
  return {
    layout,
    visibleBounds: { width, height, left, top },
    safeArea: {
      top: Math.max(0, finite(safeArea.top)),
      right: Math.max(0, finite(safeArea.right)),
      bottom: Math.max(0, finite(safeArea.bottom)),
      left: Math.max(0, finite(safeArea.left)),
    },
    obstruction,
    browserChrome: {
      ...obstruction,
      bottom: Math.max(0, obstruction.bottom - keyboardHeight),
    },
    virtualKeyboard: {
      visible: keyboardHeight > 0,
      height: keyboardHeight,
    },
  };
}

export function getViewportPolicy(
  target = typeof window !== 'undefined' ? window : undefined,
  safeArea = {},
) {
  const input = getInputCapabilities(target);
  const workingArea = getWorkingArea(target, safeArea);
  const compact = isCompactWindowViewport(
    workingArea.layout.width,
    workingArea.layout.height,
    input.coarsePointer,
  );
  return {
    presentation: { mode: compact ? 'compact' : 'desktop', compact },
    input,
    workingArea,
  };
}

/** Subscribe to every signal used by the policy and return one cleanup function. */
export function subscribeViewportPolicy(listener, target = typeof window !== 'undefined' ? window : undefined) {
  if (!target) return () => {};
  const media = ['(any-pointer: coarse)', '(any-pointer: fine)', '(any-hover: hover)']
    .map((query) => target.matchMedia?.(query))
    .filter(Boolean);
  target.addEventListener?.('resize', listener);
  target.visualViewport?.addEventListener?.('resize', listener);
  target.visualViewport?.addEventListener?.('scroll', listener);
  media.forEach((item) => {
    if (typeof item.addEventListener === 'function') item.addEventListener('change', listener);
    else item.addListener?.(listener);
  });
  return () => {
    target.removeEventListener?.('resize', listener);
    target.visualViewport?.removeEventListener?.('resize', listener);
    target.visualViewport?.removeEventListener?.('scroll', listener);
    media.forEach((item) => {
      if (typeof item.removeEventListener === 'function') item.removeEventListener('change', listener);
      else item.removeListener?.(listener);
    });
  };
}

export function compactWindowBounds(viewport, topInset, bottomInset, safe = {}) {
  const left = Math.max(0, safe.left || 0);
  const right = Math.max(0, safe.right || 0);
  return {
    x: viewport.left + left,
    y: viewport.top + topInset,
    width: Math.max(0, viewport.width - left - right),
    height: Math.max(0, viewport.height - topInset - bottomInset),
  };
}
