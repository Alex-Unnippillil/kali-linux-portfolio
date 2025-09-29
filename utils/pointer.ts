import React from 'react';

type PointerHandlerOptions = {
  /** Prevent default browser behaviour such as text selection */
  preventDefault?: boolean;
  /** Use pointer capture so move events keep firing while dragging */
  capture?: boolean;
};

/**
 * Normalise pointer interactions across mouse, touch and pen input.
 *
 * Returns handlers that can be spread on an element to trigger the provided
 * callback on pointer down. Pointer capture is enabled by default so dragging
 * continues even if the pointer leaves the element.
 */
export const pointerHandlers = <T extends HTMLElement>(
  handler: React.PointerEventHandler<T>,
  options: PointerHandlerOptions = {},
) => {
  const { preventDefault = true, capture = true } = options;

  const onPointerDown: React.PointerEventHandler<T> = (event) => {
    if (preventDefault) {
      event.preventDefault();
    }

    if (capture) {
      const target = event.currentTarget as HTMLElement;
      if (typeof target.setPointerCapture === 'function') {
        try {
          target.setPointerCapture(event.pointerId);
        } catch {
          // Older browsers may throw if the element is not connected yet.
        }
      }
    }

    handler(event);
  };

  const onPointerUp: React.PointerEventHandler<T> = (event) => {
    if (!capture) return;
    const target = event.currentTarget as HTMLElement;
    if (typeof target.releasePointerCapture === 'function') {
      try {
        if (target.hasPointerCapture?.(event.pointerId)) {
          target.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Ignore if the capture was already released.
      }
    }
  };

  const onPointerCancel = onPointerUp;

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel,
  };
};

export default pointerHandlers;
