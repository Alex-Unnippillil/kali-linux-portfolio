"use client";

import { useEffect } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import { captureScreenshot, ScreenshotMode } from '../../utils/screenshot';

const keyToMode = (e: KeyboardEvent): ScreenshotMode => {
  if (e.shiftKey) return 'region';
  if (e.ctrlKey || e.altKey) return 'window';
  return 'full';
};

export default function PrintScreenHandler() {
  const [delay] = usePersistentState<number>(
    'screenshot-delay',
    0,
    (v): v is number => typeof v === 'number',
  );
  const [includePointer] = usePersistentState<boolean>(
    'screenshot-pointer',
    false,
    (v): v is boolean => typeof v === 'boolean',
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      if (isInput) return;
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        const mode = keyToMode(e);
        captureScreenshot({
          mode,
          delay,
          includePointer,
          copy: true,
          open: true,
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [delay, includePointer]);

  return null;
}

