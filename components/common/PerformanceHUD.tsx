import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Metric } from 'web-vitals';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import { isBrowser } from '../../utils/isBrowser';

type MetricSummary = {
  id: string;
  name: string;
  value: number;
  delta: number;
  rating: Metric['rating'];
};

type HydrationMarker = {
  label: string;
  timestamp: number;
  delta: number;
};

const formatMetricName = (name: string): string => {
  switch (name) {
    case 'CLS':
      return 'Cumulative Layout Shift';
    case 'FID':
      return 'First Input Delay';
    case 'INP':
      return 'Interaction to Next Paint';
    case 'LCP':
      return 'Largest Contentful Paint';
    case 'TTFB':
      return 'Time to First Byte';
    default:
      return name;
  }
};

const useIsomorphicLayoutEffect = isBrowser ? useLayoutEffect : useEffect;

const PerformanceHUD = ({ visible }: { visible: boolean }) => {
  const [metrics, setMetrics] = useState<MetricSummary[]>([]);
  const [hydrationMarkers, setHydrationMarkers] = useState<HydrationMarker[]>([]);
  const renderStartRef = useRef<number | null>(
    isBrowser && typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : null,
  );
  const seenMarkersRef = useRef<Set<string>>(new Set());

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      }),
    [],
  );

  const upsertMetric = useCallback((metric: Metric) => {
    setMetrics((prev) => {
      const next = prev.filter((item) => item.name !== metric.name);
      next.push({
        id: metric.id,
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        rating: metric.rating,
      });
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }, []);

  const addMarker = useCallback(
    (label: string, timestamp?: number) => {
      if (seenMarkersRef.current.has(label)) return;
      const now =
        timestamp !== undefined
          ? timestamp
          : isBrowser && typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();
      const start = renderStartRef.current ?? now;
      seenMarkersRef.current.add(label);
      setHydrationMarkers((prev) => {
        const updated = [...prev, { label, timestamp: now, delta: now - start }];
        return updated.sort((a, b) => a.timestamp - b.timestamp);
      });
    },
    [],
  );

  useEffect(() => {
    if (!isBrowser) return;
    let cancelled = false;

    const handler = (metric: Metric) => {
      if (cancelled) return;
      upsertMetric(metric);
    };

    onCLS(handler);
    onFCP(handler);
    onINP(handler);
    onLCP(handler);
    onTTFB(handler);

    return () => {
      cancelled = true;
    };
  }, [upsertMetric]);

  useIsomorphicLayoutEffect(() => {
    if (!isBrowser) return;
    addMarker('layout effect');
  }, [addMarker]);

  useEffect(() => {
    if (!isBrowser) return;
    addMarker('hydrated');

    const rafId = window.requestAnimationFrame(() => {
      addMarker('after animation frame');
    });

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    let idleId: number | undefined;
    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleId = idleWindow.requestIdleCallback(() => {
        addMarker('idle');
      });
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      if (idleId !== undefined && typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleId);
      }
    };
  }, [addMarker]);

  useEffect(() => {
    addMarker('render start', renderStartRef.current ?? undefined);
  }, [addMarker]);

  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-[9999] w-80 rounded-lg border border-slate-700 bg-slate-950/90 p-4 text-xs text-slate-100 shadow-lg">
      <h2 className="mb-2 text-sm font-semibold">Performance HUD</h2>
      <section aria-label="Hydration markers" className="mb-3">
        <h3 className="mb-1 font-medium text-slate-300">Hydration timeline</h3>
        <ul className="space-y-1">
          {hydrationMarkers.map((marker) => (
            <li className="flex items-center justify-between" key={marker.label}>
              <span>{marker.label}</span>
              <span className="font-mono text-emerald-300">
                {numberFormatter.format(marker.delta)} ms
              </span>
            </li>
          ))}
          {hydrationMarkers.length === 0 && <li className="text-slate-500">Collecting markers…</li>}
        </ul>
      </section>
      <section aria-label="Web vitals">
        <h3 className="mb-1 font-medium text-slate-300">Latest web vitals</h3>
        <ul className="space-y-1">
          {metrics.map((metric) => (
            <li className="rounded border border-slate-800 bg-slate-900/60 p-2" key={metric.name}>
              <p className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">{metric.name}</span>
                <span
                  className={
                    metric.rating === 'good'
                      ? 'font-mono text-emerald-300'
                      : metric.rating === 'needs-improvement'
                      ? 'font-mono text-amber-300'
                      : 'font-mono text-rose-300'
                  }
                >
                  {numberFormatter.format(metric.value)}
                </span>
              </p>
              <p className="text-[0.7rem] text-slate-400">{formatMetricName(metric.name)}</p>
              {metric.delta !== 0 && (
                <p className="text-[0.65rem] text-slate-500">Δ {numberFormatter.format(metric.delta)}</p>
              )}
            </li>
          ))}
          {metrics.length === 0 && <li className="text-slate-500">Awaiting measurements…</li>}
        </ul>
      </section>
    </div>
  );
};

export default PerformanceHUD;
