'use client';

import { useEffect, useState } from 'react';

/** Touch is a capability, not an exclusive mode: hybrid laptops keep both inputs. */
export default function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const coarse = window.matchMedia?.('(any-pointer: coarse)');
    const primary = window.matchMedia?.('(pointer: coarse)');
    const update = () => setIsTouch(Boolean(coarse?.matches || primary?.matches || window.navigator.maxTouchPoints > 0));
    const pointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') setIsTouch(true);
    };
    update();
    const media = [coarse, primary].filter((query): query is MediaQueryList => Boolean(query));
    media.forEach((query) => {
      if (query.addEventListener) query.addEventListener('change', update);
      else query.addListener?.(update);
    });
    window.addEventListener('pointerdown', pointer, { passive: true });
    return () => {
      media.forEach((query) => {
        if (query.removeEventListener) query.removeEventListener('change', update);
        else query.removeListener?.(update);
      });
      window.removeEventListener('pointerdown', pointer);
    };
  }, []);
  return isTouch;
}
