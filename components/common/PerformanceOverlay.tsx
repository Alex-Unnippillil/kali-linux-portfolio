import { useEffect, useMemo, useState } from 'react';
import { getLatestResourceMetrics, subscribeToResourceMetrics } from '../../utils/resourceMetricsChannel';

type MemorySnapshot = {
  percent?: number;
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
} | null;

type MetricsSnapshot = {
  fps: number;
  cpu: number;
  memory: MemorySnapshot;
  net: number;
  updatedAt: number;
  source?: string;
};

const TOGGLE_KEY = 'KeyP';

export const isPerformanceOverlayEnabled = (
  env: Pick<NodeJS.ProcessEnv, 'NODE_ENV' | 'NEXT_PUBLIC_DEBUG_PERF_OVERLAY'> | undefined =
    typeof process !== 'undefined' ? process.env : undefined,
) => {
  if (!env) return false;
  return env.NODE_ENV !== 'production' || env.NEXT_PUBLIC_DEBUG_PERF_OVERLAY === 'true';
};

type PerformanceOverlayProps = {
  forceEnabled?: boolean;
};

const PerformanceOverlay = ({ forceEnabled }: PerformanceOverlayProps) => {
  const debugEnabled =
    typeof forceEnabled === 'boolean' ? forceEnabled : isPerformanceOverlayEnabled();

  const [visible, setVisible] = useState(false);
  const [metrics, setMetrics] = useState<MetricsSnapshot>(() => getLatestResourceMetrics());
  const [longTaskInfo, setLongTaskInfo] = useState({
    count: 0,
    lastDuration: 0,
    lastCompletedAt: 0,
  });

  useEffect(() => {
    if (!debugEnabled) return undefined;
    return subscribeToResourceMetrics((snapshot) => {
      setMetrics(snapshot);
    });
  }, [debugEnabled]);

  useEffect(() => {
    if (!debugEnabled) return undefined;
    const handler = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.shiftKey) return;
      if (event.code !== TOGGLE_KEY) return;
      event.preventDefault();
      setVisible((current) => !current);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [debugEnabled]);

  useEffect(() => {
    if (!debugEnabled) return undefined;
    if (typeof PerformanceObserver === 'undefined') return undefined;
    let observer: PerformanceObserver | undefined;
    try {
      observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (!entries.length) return;
        const last = entries[entries.length - 1];
        setLongTaskInfo((prev) => ({
          count: prev.count + entries.length,
          lastDuration: last.duration,
          lastCompletedAt: Date.now(),
        }));
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      if (observer) observer.disconnect();
      return undefined;
    }
    return () => {
      observer?.disconnect();
    };
  }, [debugEnabled]);

  useEffect(() => {
    if (!debugEnabled) return undefined;
    if (!visible) return undefined;
    if (metrics.source === 'resource-monitor') return undefined;
    if (typeof window === 'undefined' || typeof requestAnimationFrame !== 'function') return undefined;

    let raf: number;
    let lastFrame = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

    const loop = (now: number) => {
      const frameNow = now || (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
      const delta = frameNow - lastFrame;
      lastFrame = frameNow;
      const currentFps = delta > 0 ? 1000 / delta : metrics.fps;

      let memory: MemorySnapshot = null;
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        const { usedJSHeapSize, totalJSHeapSize } = (performance as any).memory;
        const percent = totalJSHeapSize ? (usedJSHeapSize / totalJSHeapSize) * 100 : undefined;
        memory = {
          percent,
          usedJSHeapSize,
          totalJSHeapSize,
        };
      }

      setMetrics((prev) => ({
        ...prev,
        fps: Number.isFinite(currentFps) ? currentFps : prev.fps,
        memory: memory ?? prev.memory,
        updatedAt: Date.now(),
        source: prev.source ?? 'overlay',
      }));

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [visible, debugEnabled, metrics.source, metrics.fps, metrics.memory]);

  const memorySummary = useMemo(() => {
    if (!metrics.memory) return 'n/a';
    const { percent, usedJSHeapSize, totalJSHeapSize } = metrics.memory;
    if (usedJSHeapSize && totalJSHeapSize) {
      const usedMb = usedJSHeapSize / (1024 * 1024);
      const totalMb = totalJSHeapSize / (1024 * 1024);
      return `${usedMb.toFixed(1)} / ${totalMb.toFixed(1)} MB${
        typeof percent === 'number' ? ` (${percent.toFixed(1)}%)` : ''
      }`;
    }
    if (typeof percent === 'number') {
      return `${percent.toFixed(1)}%`;
    }
    return 'n/a';
  }, [metrics.memory]);

  const longTaskSummary = useMemo(() => {
    if (!longTaskInfo.count) return 'No long tasks detected';
    return `Long tasks: ${longTaskInfo.count} (last ${longTaskInfo.lastDuration.toFixed(0)}ms)`;
  }, [longTaskInfo]);

  if (!debugEnabled) return null;

  return visible ? (
    <div className="fixed right-4 top-4 z-[9999] w-72 rounded-lg bg-black/80 p-4 text-xs text-white shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-300">
        <span>Performance overlay</span>
        <span className="font-mono text-[10px] text-gray-400">Ctrl+Shift+P</span>
      </div>
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-400">FPS</dt>
          <dd className="font-mono">{metrics.fps.toFixed(1)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-400">Memory</dt>
          <dd className="font-mono text-right">{memorySummary}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-400">CPU</dt>
          <dd className="font-mono">{metrics.cpu.toFixed(1)}%</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-400">Network</dt>
          <dd className="font-mono">{metrics.net.toFixed(1)} Mbps</dd>
        </div>
      </dl>
      <p className="mt-2 rounded bg-white/10 p-2 text-[11px] text-gray-200">{longTaskSummary}</p>
    </div>
  ) : null;
};

export default PerformanceOverlay;
