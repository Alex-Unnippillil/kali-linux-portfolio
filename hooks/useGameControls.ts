import { useEffect } from 'react';

export type KeyHandler = (event: KeyboardEvent) => void;
export type TouchHandler = (event: TouchEvent) => void;

export interface GameControlOptions {
  keydown?: Record<string, KeyHandler>;
  keyup?: Record<string, KeyHandler>;
  swipe?: {
    left?: TouchHandler;
    right?: TouchHandler;
    up?: TouchHandler;
    down?: TouchHandler;
  };
  touchStart?: TouchHandler;
  element?: HTMLElement | null;
  threshold?: number;
}

const normalizeKey = (key: string) => (key.length === 1 ? key.toLowerCase() : key);

const useGameControls = ({
  keydown,
  keyup,
  swipe,
  touchStart,
  element,
  threshold = 30,
}: GameControlOptions) => {
  useEffect(() => {
    if (!keydown) return undefined;
    const handler = (e: KeyboardEvent) => {
      const key = normalizeKey(e.key);
      const fn = keydown[key] || keydown[e.code];
      if (fn) fn(e);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [keydown]);

  useEffect(() => {
    if (!keyup) return undefined;
    const handler = (e: KeyboardEvent) => {
      const key = normalizeKey(e.key);
      const fn = keyup[key] || keyup[e.code];
      if (fn) fn(e);
    };
    window.addEventListener('keyup', handler);
    return () => window.removeEventListener('keyup', handler);
  }, [keyup]);

  useEffect(() => {
    if (!swipe && !touchStart) return undefined;
    const target: any = element || window;
    let startX = 0;
    let startY = 0;
    const start = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      if (touchStart) touchStart(e);
    };
    const end = (e: TouchEvent) => {
      if (!swipe) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > threshold && swipe.right) swipe.right(e);
        else if (dx < -threshold && swipe.left) swipe.left(e);
      } else {
        if (dy > threshold && swipe.down) swipe.down(e);
        else if (dy < -threshold && swipe.up) swipe.up(e);
      }
    };
    target.addEventListener('touchstart', start, { passive: true });
    if (swipe) target.addEventListener('touchend', end);
    return () => {
      target.removeEventListener('touchstart', start);
      if (swipe) target.removeEventListener('touchend', end);
    };
  }, [swipe, touchStart, element, threshold]);
};

export default useGameControls;

