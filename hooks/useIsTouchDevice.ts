"use client";

import { useEffect, useState } from 'react';

const getIsTouch = () => {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(pointer: coarse)').matches;
  }
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export default function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(getIsTouch);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia?.('(pointer: coarse)');
    if (!media) return undefined;
    const handler = (event: MediaQueryListEvent) => {
      setIsTouch(event.matches);
    };
    media.addEventListener?.('change', handler);
    return () => {
      media.removeEventListener?.('change', handler);
    };
  }, []);

  return isTouch;
}
