'use client';
import { useEffect, useState } from 'react';

export function useGameWorker() {
  const [worker, setWorker] = useState<Worker | null>(null);

  useEffect(() => {
    const w = new Worker(new URL('./worker.ts', import.meta.url));
    setWorker(w);
    return () => w.terminate();
  }, []);

  return worker;
}
