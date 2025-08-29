'use client';

import { useEffect } from 'react';

export default function TiltSensor({ onNudge }: { onNudge: () => void }) {
  useEffect(() => {
    let active = false;
    let last = 0;

    const enable = () => {
      if (
        typeof DeviceMotionEvent !== 'undefined' &&
        typeof (DeviceMotionEvent as any).requestPermission === 'function'
      ) {
        (DeviceMotionEvent as any)
          .requestPermission()
          .then((state: string) => {
            if (state === 'granted') active = true;
          })
          .catch(() => {});
      } else {
        active = true;
      }
    };

    const handleMotion = (e: DeviceMotionEvent) => {
      if (!active) return;
      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc) return;
      const { x = 0, y = 0, z = 0 } = acc;
      const mag = Math.sqrt(x * x + y * y + z * z);
      if (mag > 25 && Date.now() - last > 500) {
        last = Date.now();
        onNudge();
      }
    };

    window.addEventListener('click', enable, { once: true });
    window.addEventListener('devicemotion', handleMotion);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [onNudge]);

  return null;
}

