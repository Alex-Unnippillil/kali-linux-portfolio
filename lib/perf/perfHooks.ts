import { useEffect, useState } from 'react';

export function useFPS(): number {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let frame = 0;
    let last = performance.now();
    let rafId = 0;
    const loop = (now: number) => {
      frame += 1;
      const delta = now - last;
      if (delta >= 1000) {
        setFps((frame * 1000) / delta);
        frame = 0;
        last = now;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);
  return fps;
}

export function useResourceTiming(): PerformanceResourceTiming[] {
  const [entries, setEntries] = useState<PerformanceResourceTiming[]>([]);
  useEffect(() => {
    if (typeof window === 'undefined' || !('performance' in window)) return;
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const obs = new PerformanceObserver((list) => {
          setEntries((prev) => [...prev, ...(list.getEntries() as PerformanceResourceTiming[])]);
        });
        obs.observe({ type: 'resource', buffered: true });
        return () => obs.disconnect();
      } catch {
        // ignore
      }
    }
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    setEntries(resources);
  }, []);
  return entries;
}

interface NetworkInfo {
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
  saveData?: boolean;
  uplink?: number;
}

export function useNetworkInformation(): NetworkInfo {
  const [info, setInfo] = useState<NetworkInfo>({});
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) return;
    const connection = (navigator as any).connection;
    const update = () => {
      setInfo({
        downlink: connection.downlink,
        effectiveType: connection.effectiveType,
        rtt: connection.rtt,
        saveData: connection.saveData,
        uplink: connection.uplink || connection.upload,
      });
    };
    update();
    connection.addEventListener?.('change', update);
    return () => connection.removeEventListener?.('change', update);
  }, []);
  return info;
}

