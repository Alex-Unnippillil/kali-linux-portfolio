"use client";

import React, { useEffect, useMemo, useState } from 'react';
import useSystemMetrics from '../../hooks/useSystemMetrics';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { useSettings } from '../../hooks/useSettings';

const clampPercentage = (value: number) => Math.min(100, Math.max(0, value));

function useClockLabel() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const update = () => setNow(new Date());
    update();
    const id = window.setInterval(update, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    if (!now) {
      return {
        formatted: '—',
        iso: undefined,
        announcement: 'Clock unavailable',
      } as const;
    }
    const date = now.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const time = now.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    const formatted = `${date} · ${time}`;
    return {
      formatted,
      iso: now.toISOString(),
      announcement: `System clock ${formatted}`,
    } as const;
  }, [now]);
}

interface MetricWidgetProps {
  label: string;
  value: number;
  reducedMotion: boolean;
}

function MetricWidget({ label, value, reducedMotion }: MetricWidgetProps) {
  const percent = clampPercentage(value);
  const formatted = `${Math.round(percent)}%`;
  const barStyle: React.CSSProperties = reducedMotion
    ? { width: `${percent}%` }
    : { width: `${percent}%`, transition: 'width 0.4s ease' };

  return (
    <div
      role="group"
      aria-label={`${label} usage`}
      className="flex items-center gap-1 text-xs text-ubt-grey"
      title={`${label} usage ${formatted}`}
    >
      <span aria-hidden="true" className="font-semibold uppercase tracking-wide">
        {label}
      </span>
      <div className="relative h-2 w-16 overflow-hidden rounded-sm bg-white/20" aria-hidden="true">
        <div className="absolute inset-y-0 left-0 bg-ub-orange" style={barStyle} />
      </div>
      <span className="font-mono" aria-live="polite">
        {formatted}
      </span>
      <span className="sr-only">{`${label} usage ${formatted}`}</span>
    </div>
  );
}

export default function StatusBar() {
  const metrics = useSystemMetrics();
  const reducedMotion = usePrefersReducedMotion();
  const {
    showStatusClock,
    showStatusCpu,
    showStatusMemory,
  } = useSettings();

  const clock = useClockLabel();

  return (
    <div
      className="flex items-center gap-4 rounded-md bg-ub-grey/80 px-3 py-2 text-white shadow"
      role="presentation"
    >
      {showStatusClock && (
        <time
          aria-label="System clock"
          aria-live="polite"
          dateTime={clock.iso}
          className="text-xs font-medium"
        >
          <span aria-hidden="true">{clock.formatted}</span>
          <span className="sr-only">{clock.announcement}</span>
        </time>
      )}
      {showStatusCpu && (
        <MetricWidget
          label="CPU"
          value={metrics.cpu}
          reducedMotion={reducedMotion}
        />
      )}
      {showStatusMemory && (
        <MetricWidget
          label="RAM"
          value={metrics.memory}
          reducedMotion={reducedMotion}
        />
      )}
    </div>
  );
}

