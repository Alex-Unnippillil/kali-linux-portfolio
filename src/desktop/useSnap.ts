import { useEffect } from 'react';

export interface SnapBounds extends DOMRectInit {
  width: number;
  height: number;
  x: number;
  y: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface WindowManager {
  setBounds(id: string, bounds: SnapBounds): void;
}

export interface UseSnapOptions {
  /**
   * CSS selector used to discover window elements. Defaults to `[data-window-id]`.
   */
  selector?: string;
  /**
   * Optional selector restricting the drag handle area. When provided the snap
   * logic only activates if the pointer originates from an element matching the
   * selector (or one of its descendants).
   */
  handleSelector?: string;
  /**
   * Distance from the viewport edges used to decide when to snap. Defaults to
   * `32px`.
   */
  threshold?: number;
}

const DEFAULT_SELECTOR = '[data-window-id]';
const DEFAULT_THRESHOLD = 32;

const getViewportSize = () => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }
  const { innerWidth, innerHeight } = window;
  const doc = typeof document !== 'undefined' ? document.documentElement : null;
  return {
    width: innerWidth || doc?.clientWidth || 0,
    height: innerHeight || doc?.clientHeight || 0,
  };
};

const createBounds = (x: number, y: number, width: number, height: number): SnapBounds => {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const left = x;
  const top = y;
  const right = left + w;
  const bottom = top + h;
  return { x: left, y: top, width: w, height: h, top, left, right, bottom };
};

const applySnap = (
  wm: WindowManager,
  id: string,
  rect: SnapBounds,
  threshold: number,
) => {
  const snapThreshold = Math.max(0, threshold);
  const { width: viewportWidth, height: viewportHeight } = getViewportSize();
  let snappedBounds = rect;

  if (viewportWidth > 0 && viewportHeight > 0) {
    if (rect.top <= snapThreshold) {
      snappedBounds = createBounds(0, 0, viewportWidth, viewportHeight);
    } else if (rect.left <= snapThreshold) {
      const tileWidth = Math.round(viewportWidth / 2);
      snappedBounds = createBounds(0, 0, tileWidth, viewportHeight);
    } else if (rect.right >= viewportWidth - snapThreshold) {
      const tileWidth = Math.round(viewportWidth / 2);
      snappedBounds = createBounds(viewportWidth - tileWidth, 0, tileWidth, viewportHeight);
    }
  }

  wm.setBounds(id, snappedBounds);
};

const bindElement = (
  element: HTMLElement,
  id: string,
  wm: WindowManager,
  threshold: number,
  handleSelector?: string,
) => {
  let activePointer: number | null = null;
  let lastRect: SnapBounds | null = null;
  let removeActiveListeners: (() => void) | null = null;

  const handlePointerDown = (event: PointerEvent) => {
    if (!event.isPrimary) return;
    if (event.button !== 0 && event.button !== -1) return;
    if (!element.isConnected) return;
    if (handleSelector && !(event.target instanceof Element && event.target.closest(handleSelector))) {
      return;
    }

    const bounding = element.getBoundingClientRect();
    lastRect = createBounds(bounding.left, bounding.top, bounding.width, bounding.height);
    activePointer = event.pointerId;

    const startX = event.clientX;
    const startY = event.clientY;

    const updatePosition = (clientX: number, clientY: number) => {
      if (!lastRect) return;
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;
      const next = createBounds(
        bounding.left + deltaX,
        bounding.top + deltaY,
        bounding.width,
        bounding.height,
      );
      lastRect = next;
      wm.setBounds(id, next);
    };

    const finalize = (eventRect?: SnapBounds) => {
      const rect = eventRect || lastRect;
      if (!rect) return;
      applySnap(wm, id, rect, threshold);
      activePointer = null;
      lastRect = null;
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (activePointer !== moveEvent.pointerId) return;
      moveEvent.preventDefault();
      updatePosition(moveEvent.clientX, moveEvent.clientY);
    };

    const finish = (evt: PointerEvent) => {
      if (activePointer !== evt.pointerId) return;
      detachPointerListeners();
      const rect = createBounds(
        bounding.left + (evt.clientX - startX),
        bounding.top + (evt.clientY - startY),
        bounding.width,
        bounding.height,
      );
      finalize(rect);
    };

    const cancel = (evt: PointerEvent) => {
      if (activePointer !== evt.pointerId) return;
      detachPointerListeners();
      finalize();
    };

    const detachPointerListeners = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel);
      if (typeof element.releasePointerCapture === 'function' && activePointer !== null) {
        try {
          element.releasePointerCapture(activePointer);
        } catch {
          // ignore failures when the pointer is already released
        }
      }
      removeActiveListeners = null;
    };

    if (typeof element.setPointerCapture === 'function') {
      try {
        element.setPointerCapture(activePointer);
      } catch {
        // ignore pointer capture failures (e.g. element hidden)
      }
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', cancel);
    removeActiveListeners = detachPointerListeners;
  };

  element.addEventListener('pointerdown', handlePointerDown);

  return () => {
    element.removeEventListener('pointerdown', handlePointerDown);
    removeActiveListeners?.();
  };
};

export function useSnap(
  wm: WindowManager | null | undefined,
  options: UseSnapOptions = {},
) {
  const {
    selector: selectorOption = DEFAULT_SELECTOR,
    handleSelector,
    threshold: thresholdOption = DEFAULT_THRESHOLD,
  } = options;
  const threshold = Math.max(0, thresholdOption);

  useEffect(() => {
    if (!wm) return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const root = document.body;
    if (!root) return;

    const cleanupMap = new Map<HTMLElement, () => void>();

    const addElement = (node: HTMLElement) => {
      if (!node.matches(selectorOption)) return;
      const windowId = node.dataset.windowId || node.id;
      if (!windowId || cleanupMap.has(node)) return;
      const cleanup = bindElement(node, windowId, wm, threshold, handleSelector);
      cleanupMap.set(node, cleanup);
    };

    const removeElement = (node: HTMLElement) => {
      const cleanup = cleanupMap.get(node);
      if (cleanup) {
        cleanup();
        cleanupMap.delete(node);
      }
    };

    document
      .querySelectorAll<HTMLElement>(selectorOption)
      .forEach((el) => addElement(el));

    const observer = typeof MutationObserver !== 'undefined'
      ? new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.removedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              if (node.matches(selectorOption)) {
                removeElement(node);
              }
              node.querySelectorAll?.(selectorOption).forEach((child) => {
                if (child instanceof HTMLElement) {
                  removeElement(child);
                }
              });
            }
          });
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              if (node.matches(selectorOption)) {
                addElement(node);
              }
              node.querySelectorAll?.(selectorOption).forEach((child) => {
                if (child instanceof HTMLElement) {
                  addElement(child);
                }
              });
            }
          });
        });
      })
      : null;

    observer?.observe(root, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      cleanupMap.forEach((cleanup) => cleanup());
      cleanupMap.clear();
    };
  }, [wm, selectorOption, handleSelector, threshold]);
}

export default useSnap;
