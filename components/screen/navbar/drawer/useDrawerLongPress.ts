import { useCallback, useEffect, useRef } from 'react';
import type { PointerEventHandler } from 'react';

const LONG_PRESS_DELAY_MS = 450;
const MOVE_THRESHOLD_PX = 12;

export type DrawerLongPressEvent = {
  target: HTMLElement;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
};

export type DrawerLongPressHandlers<T extends HTMLElement = HTMLElement> = {
  onPointerDown: PointerEventHandler<T>;
  onPointerMove: PointerEventHandler<T>;
  onPointerUp: PointerEventHandler<T>;
  onPointerCancel: PointerEventHandler<T>;
  onPointerLeave: PointerEventHandler<T>;
};

const vibrateOnce = () => {
  if (typeof navigator === 'undefined') return;
  const vibrate = navigator.vibrate;
  if (typeof vibrate === 'function') {
    try {
      vibrate.call(navigator, 10);
    } catch {
      // ignore vibration errors (e.g. unsupported platforms)
    }
  }
};

export const useDrawerLongPress = <T extends HTMLElement = HTMLElement>(
  onTrigger: (event: DrawerLongPressEvent) => void,
  options?: {
    delay?: number;
    moveThreshold?: number;
  },
): DrawerLongPressHandlers<T> => {
  const delay = options?.delay ?? LONG_PRESS_DELAY_MS;
  const moveThreshold = options?.moveThreshold ?? MOVE_THRESHOLD_PX;

  const timerRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startRef = useRef<{ clientX: number; clientY: number; pageX: number; pageY: number } | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const triggeredRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    pointerIdRef.current = null;
    startRef.current = null;
    targetRef.current = null;
    triggeredRef.current = false;
  }, [clearTimer]);

  const fire = useCallback(() => {
    if (!targetRef.current || !startRef.current) return;
    triggeredRef.current = true;
    clearTimer();
    vibrateOnce();
    onTrigger({
      target: targetRef.current,
      clientX: startRef.current.clientX,
      clientY: startRef.current.clientY,
      pageX: startRef.current.pageX,
      pageY: startRef.current.pageY,
    });
  }, [clearTimer, onTrigger]);

  const onPointerDown = useCallback<PointerEventHandler<T>>(
    (event) => {
      if (event.pointerType !== 'touch' || !event.isPrimary) return;
      const host = event.currentTarget as HTMLElement | null;
      const eventTarget = event.target as HTMLElement | null;
      const contextElement =
        eventTarget?.closest('[data-context]') ?? host?.querySelector('[data-context]');
      if (!contextElement) return;
      pointerIdRef.current = event.pointerId;
      startRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
        pageX: event.pageX,
        pageY: event.pageY,
      };
      targetRef.current = contextElement as HTMLElement;
      triggeredRef.current = false;
      clearTimer();
      timerRef.current = window.setTimeout(fire, delay);
    },
    [clearTimer, delay, fire],
  );

  const onPointerMove = useCallback<PointerEventHandler<T>>(
    (event) => {
      if (pointerIdRef.current !== event.pointerId || event.pointerType !== 'touch') return;
      if (!startRef.current || triggeredRef.current) return;
      const dx = event.clientX - startRef.current.clientX;
      const dy = event.clientY - startRef.current.clientY;
      if (Math.hypot(dx, dy) > moveThreshold) {
        reset();
      }
    },
    [moveThreshold, reset],
  );

  const onPointerUp = useCallback<PointerEventHandler<T>>(
    (event) => {
      if (pointerIdRef.current !== event.pointerId) return;
      if (triggeredRef.current) {
        event.preventDefault();
        event.stopPropagation();
      }
      reset();
    },
    [reset],
  );

  const onPointerCancel = useCallback<PointerEventHandler<T>>(
    (event) => {
      if (pointerIdRef.current !== event.pointerId) return;
      reset();
    },
    [reset],
  );

  const onPointerLeave = useCallback<PointerEventHandler<T>>(
    (event) => {
      if (pointerIdRef.current !== event.pointerId) return;
      if (triggeredRef.current) {
        reset();
        return;
      }
      reset();
    },
    [reset],
  );

  useEffect(() => reset, [reset]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
  };
};
