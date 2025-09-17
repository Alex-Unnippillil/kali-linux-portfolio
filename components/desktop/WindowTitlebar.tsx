import React, { useCallback, useEffect, useRef, useState } from 'react';

import { vibrate } from '@/components/apps/Games/common/haptics';

const LONG_PRESS_DELAY = 450;
const HAPTIC_DURATION = 20;

type PointerKind = React.PointerEvent['pointerType'];

interface WindowTitlebarProps {
  title: string;
  grabbed?: boolean;
  onBlur?: React.FocusEventHandler<HTMLDivElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
}

const WindowTitlebar: React.FC<WindowTitlebarProps> = ({
  title,
  grabbed = false,
  onBlur,
  onKeyDown,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const pointerTypeRef = useRef<PointerKind>('mouse');
  const activatedRef = useRef(false);
  const lastPositionRef = useRef({
    clientX: 0,
    clientY: 0,
    screenX: 0,
    screenY: 0,
    pageX: 0,
    pageY: 0,
  });
  const [ready, setReady] = useState(false);

  const clearHoldTimer = useCallback(
    (preserveReady = false) => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (!preserveReady) {
        activatedRef.current = false;
        setReady(false);
      }
    },
    [],
  );

  useEffect(
    () => () => {
      clearHoldTimer();
    },
    [clearHoldTimer],
  );

  useEffect(() => {
    if (!grabbed) {
      setReady(false);
      activatedRef.current = false;
    }
  }, [grabbed]);

  const dispatchSyntheticStart = useCallback(() => {
    const element = rootRef.current;
    if (!element) return;

    const pointerId = pointerIdRef.current;

    if (pointerId !== null) {
      try {
        element.releasePointerCapture(pointerId);
      } catch {
        // ignore if the environment does not support pointer capture
      }
    }

    const { clientX, clientY, screenX, screenY, pageX, pageY } = lastPositionRef.current;
    const pointerType = pointerTypeRef.current;

    if (
      pointerType === 'touch' &&
      typeof window !== 'undefined' &&
      'TouchEvent' in window &&
      'Touch' in window
    ) {
      try {
        const touch = new Touch({
          identifier: pointerId ?? Date.now(),
          target: element,
          clientX,
          clientY,
          screenX,
          screenY,
          pageX,
          pageY,
          radiusX: 1,
          radiusY: 1,
          rotationAngle: 0,
          force: 1,
        });

        const touchEvent = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [touch],
          targetTouches: [touch],
          changedTouches: [touch],
        });

        element.dispatchEvent(touchEvent);
        return;
      } catch {
        // Fall back to a mouse event when Touch constructors are unavailable.
      }
    }

    const mouseEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      screenX,
      screenY,
      button: 0,
      buttons: 1,
    });

    element.dispatchEvent(mouseEvent);
  }, []);

  const beginHold = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }

      pointerIdRef.current = event.pointerId;
      pointerTypeRef.current = event.pointerType ?? 'mouse';
      activatedRef.current = false;

      lastPositionRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        pageX: event.pageX,
        pageY: event.pageY,
      };

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // ignore if pointer capture isn't supported
      }

      event.preventDefault();
      event.stopPropagation();

      if (typeof event.currentTarget.focus === 'function') {
        try {
          event.currentTarget.focus({ preventScroll: true });
        } catch {
          event.currentTarget.focus();
        }
      }

      clearHoldTimer();

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        activatedRef.current = true;
        setReady(true);
        vibrate(HAPTIC_DURATION);
        dispatchSyntheticStart();
      }, LONG_PRESS_DELAY);
    },
    [clearHoldTimer, dispatchSyntheticStart],
  );

  const updatePosition = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    lastPositionRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: event.screenX,
      screenY: event.screenY,
      pageX: event.pageX,
      pageY: event.pageY,
    };
  }, []);

  const endHold = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId) {
        return;
      }

      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore if pointer capture isn't supported
      }

      const preserveReady = activatedRef.current && grabbed;
      clearHoldTimer(preserveReady);
      pointerIdRef.current = null;
      pointerTypeRef.current = 'mouse';
    },
    [clearHoldTimer, grabbed],
  );

  const cancelHold = useCallback(() => {
    clearHoldTimer();
    pointerIdRef.current = null;
    pointerTypeRef.current = 'mouse';
  }, [clearHoldTimer]);

  return (
    <div
      ref={rootRef}
      className={`relative bg-ub-window-title border-t-2 border-white border-opacity-5 px-3 text-white w-full select-none rounded-b-none flex items-center h-11${ready ? ' desktop-titlebar--drag-ready' : ''}`}
      tabIndex={0}
      role="button"
      aria-grabbed={grabbed}
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        cancelHold();
        onBlur?.(event);
      }}
      onPointerDown={beginHold}
      onPointerMove={updatePosition}
      onPointerUp={endHold}
      onPointerCancel={cancelHold}
      onPointerLeave={(event) => {
        if (pointerIdRef.current === event.pointerId) {
          cancelHold();
        }
      }}
    >
      <div className="flex justify-center w-full text-sm font-bold">{title}</div>
    </div>
  );
};

export default WindowTitlebar;
