'use client';

import { useEffect } from 'react';

export const shouldTilt = (
  acc: DeviceMotionEventAcceleration | null,
  threshold: number,
): boolean => {
  if (!acc) return false;
  const x = acc.x ?? 0;
  const y = acc.y ?? 0;
  const z = acc.z ?? 0;
  const magnitude = Math.sqrt(x * x + y * y + z * z);
  return magnitude > threshold;
};

export const useTiltSensor = (
  threshold: number,
  onTilt: () => void,
  enabled = true,
): void => {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    const handler = (e: DeviceMotionEvent) => {
      if (shouldTilt(e.accelerationIncludingGravity, threshold)) onTilt();
    };
    let listening = false;
    const start = () => {
      window.addEventListener('devicemotion', handler);
      listening = true;
    };
    const D = (window as any).DeviceMotionEvent;
    if (typeof D?.requestPermission === 'function') {
      D.requestPermission().then((res: string) => {
        if (res === 'granted') start();
      });
    } else if (D) {
      start();
    }
    return () => {
      if (listening) window.removeEventListener('devicemotion', handler);
    };
  }, [enabled, threshold, onTilt]);
};
