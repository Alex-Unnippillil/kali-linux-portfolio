import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

type MemoryInfo = {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
};

const ResourceMonitor: React.FC = () => {
  const router = useRouter();
  const [paints, setPaints] = useState<PerformanceEntry[]>([]);
  const [longTasks, setLongTasks] = useState<PerformanceEntry[]>([]);
  const [memory, setMemory] = useState<MemoryInfo | null>(null);
  const [waterfall, setWaterfall] = useState<PerformanceResourceTiming[]>([]);

  // observe paint and long tasks
  useEffect(() => {
    const paintObserver = new PerformanceObserver((list) => {
      setPaints((prev) => [...prev, ...list.getEntries()]);
    });
    try {
      paintObserver.observe({ type: 'paint', buffered: true });
    } catch {
      // ignore if not supported
    }

    const longObserver = new PerformanceObserver((list) => {
      setLongTasks((prev) => [...prev, ...list.getEntries()]);
    });
    try {
      longObserver.observe({ type: 'longtask', buffered: true });
    } catch {
      // ignore if not supported
    }

    const updateMemory = () => {
      if ('memory' in performance) {
        const m = (performance as any).memory as MemoryInfo;
        setMemory({
          jsHeapSizeLimit: m.jsHeapSizeLimit,
          totalJSHeapSize: m.totalJSHeapSize,
          usedJSHeapSize: m.usedJSHeapSize,
        });
      } else if ((performance as any).measureUserAgentSpecificMemory) {
        (performance as any)
          .measureUserAgentSpecificMemory()
          .then((res: any) => setMemory(res))
          .catch(() => {});
      }
    };
    updateMemory();
    const memoryInterval = setInterval(updateMemory, 5000);

    return () => {
      paintObserver.disconnect();
      longObserver.disconnect();
      clearInterval(memoryInterval);
    };
  }, []);

  // waterfall per route
  useEffect(() => {
    const updateWaterfall = () => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      setWaterfall(entries);
    };
    updateWaterfall();
    router.events.on('routeChangeComplete', updateWaterfall);
    return () => {
      router.events.off('routeChangeComplete', updateWaterfall);
    };
  }, [router]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Resource Monitor</h1>

      <section>
        <h2 className="font-semibold">Paint Events</h2>
        <ul className="list-disc ml-4">
          {paints.map((p, i) => (
            <li key={i}>
              {p.name}: {p.startTime.toFixed(2)} ms
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Long Tasks</h2>
        <ul className="list-disc ml-4">
          {longTasks.map((t, i) => (
            <li key={i}>
              start {t.startTime.toFixed(2)} ms, duration {t.duration.toFixed(2)} ms
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Memory Estimate</h2>
        {memory ? (
          <div>
            <div>Used JS Heap: {Math.round(memory.usedJSHeapSize / 1024 / 1024)} MB</div>
            <div>Total JS Heap: {Math.round(memory.totalJSHeapSize / 1024 / 1024)} MB</div>
          </div>
        ) : (
          <p>Memory info unavailable</p>
        )}
      </section>

      <section>
        <h2 className="font-semibold">Waterfall for {router.asPath}</h2>
        <ul className="list-disc ml-4">
          {waterfall.map((r, i) => (
            <li key={i}>
              {r.initiatorType} {r.name} - start {r.startTime.toFixed(2)} ms, duration {r.duration.toFixed(2)} ms
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default ResourceMonitor;

