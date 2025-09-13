"use client";

import { useEffect, useState } from 'react';

interface Props {
  showSeconds: boolean;
}

const PanelClock = ({ showSeconds }: Props) => {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setTime(new Date());
    update();

    let worker: Worker | undefined;
    let interval: NodeJS.Timeout | undefined;
    const intervalMs = showSeconds ? 1000 : 10 * 1000;

    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      worker = new Worker(new URL('../../workers/timer.worker.ts', import.meta.url));
      worker.onmessage = update;
      worker.postMessage({ action: 'start', interval: intervalMs });
    } else {
      interval = setInterval(update, intervalMs);
    }

    return () => {
      if (worker) {
        worker.postMessage({ action: 'stop' });
        worker.terminate();
      }
      if (interval) clearInterval(interval);
    };
  }, [showSeconds]);

  if (!time) return <span suppressHydrationWarning></span>;

  const hour = time.getHours().toString().padStart(2, '0');
  const minute = time.getMinutes().toString().padStart(2, '0');
  const second = time.getSeconds().toString().padStart(2, '0');

  const display = showSeconds ? `${hour}:${minute}:${second}` : `${hour}:${minute}`;

  return <span suppressHydrationWarning>{display}</span>;
};

export default PanelClock;
