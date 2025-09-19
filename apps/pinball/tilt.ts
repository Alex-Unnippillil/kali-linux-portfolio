'use client';

import { useEffect } from 'react';
import usePermissions from '../../hooks/usePermissions';

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
): void => {
  const { requestPermission } = usePermissions();

  useEffect(() => {
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
      requestPermission({
        permission: 'motion',
        appName: 'Pinball',
        title: 'Motion sensor access',
        message: 'Allow Pinball to read motion data to detect tilts.',
        details: [
          'Only acceleration data is used for tilt detection.',
          'Permission persists until you revoke it from Settings.',
        ],
        successMessage: 'Tilt detection enabled.',
        failureMessage: 'Motion sensor permission denied.',
        request: async () => {
          const res = await D.requestPermission();
          if (res === 'granted') start();
          return res === 'granted';
        },
      }).catch(() => {});
    } else if (D) {
      start();
    }
    return () => {
      if (listening) window.removeEventListener('devicemotion', handler);
    };
  }, [threshold, onTilt, requestPermission]);
};
