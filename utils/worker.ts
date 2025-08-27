import { useEffect, useState } from 'react';

export const useWorker = <In = unknown, Out = unknown>(
  path: string,
  onMessage?: (e: MessageEvent<Out>) => void,
) => {
  const [worker, setWorker] = useState<
    (Worker & { postMessage(data: In): void }) | null
  >(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Worker' in window)) return;
    const w = new Worker(new URL(path, import.meta.url));
    if (onMessage) w.onmessage = onMessage as (e: MessageEvent) => void;
    setWorker(w as typeof worker);
    return () => {
      w.terminate();
    };
  }, [path, onMessage]);

  return worker;
};

export default useWorker;
