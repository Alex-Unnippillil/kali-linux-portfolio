import { useEffect, useRef } from 'react';
import { hasOffscreenCanvas } from '../../../../utils/feature';

/**
 * Simple game loop helper that provides frame-time delta in seconds to the
 * callback. The loop runs only while `running` is true.
 */
export default function useGameLoop(
  callback: (delta: number) => void,
  running = true,
) {
  const cb = useRef(callback);
  cb.current = callback;
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const supportsWorkerLoop =
      typeof Worker === 'function' && hasOffscreenCanvas();

    if (!running) {
      if (supportsWorkerLoop && workerRef.current) {
        workerRef.current.postMessage({ type: 'stop' });
      }
      return undefined;
    }

    if (supportsWorkerLoop) {
      const worker = new Worker(
        new URL('../../../../workers/game-loop-scheduler.worker.ts', import.meta.url),
      );
      workerRef.current = worker;
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'tick') {
          cb.current(event.data.delta as number);
        }
      };
      worker.addEventListener('message', handleMessage);
      worker.postMessage({ type: 'start' });
      return () => {
        worker.postMessage({ type: 'stop' });
        worker.removeEventListener('message', handleMessage);
        worker.terminate();
        workerRef.current = null;
      };
    }

    let raf: number;
    let last = performance.now();
    const loop = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      cb.current(delta);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}
