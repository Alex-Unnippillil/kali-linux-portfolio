'use client';

import clsx from 'clsx';
import React, {
  ForwardedRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

export type SignalSample = {
  bssid: string;
  rssi: number;
  timestamp: number;
};

export type SignalSeriesSummary = {
  count: number;
  oldest?: number;
  newest?: number;
  lastTimestamp?: number;
  lastValue?: number;
};

export interface SignalGraphHandle {
  pushSample: (sample: SignalSample) => void;
  pushSamples: (samples: SignalSample[]) => void;
  clear: () => void;
  getSeriesSummary: (bssid: string) => SignalSeriesSummary | undefined;
}

interface SignalGraphProps {
  className?: string;
  durationMs?: number;
  height?: number;
}

const MIN_RSSI = -95;
const MAX_RSSI = -25;
const DEFAULT_WIDTH = 640;

const palette = [
  '#38bdf8',
  '#a855f7',
  '#22c55e',
  '#f97316',
  '#f43f5e',
  '#eab308',
  '#14b8a6',
  '#ef4444',
];

class CircularSeries {
  private times: Float64Array;
  private values: Float32Array;
  private capacity: number;
  private head = 0;
  private length = 0;
  private latestTimestamp = 0;
  private latestValue = 0;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.times = new Float64Array(capacity);
    this.values = new Float32Array(capacity);
  }

  push(timestamp: number, value: number) {
    this.times[this.head] = timestamp;
    this.values[this.head] = value;
    this.head = (this.head + 1) % this.capacity;
    if (this.length < this.capacity) {
      this.length += 1;
    }
    this.latestTimestamp = timestamp;
    this.latestValue = value;
  }

  prune(minTime: number) {
    while (this.length > 0) {
      const oldestIndex = (this.head - this.length + this.capacity) % this.capacity;
      if (this.times[oldestIndex] >= minTime) {
        break;
      }
      this.length -= 1;
    }
  }

  forEach(fromTime: number, callback: (timestamp: number, value: number) => void) {
    for (let i = 0; i < this.length; i += 1) {
      const index = (this.head - this.length + i + this.capacity) % this.capacity;
      const time = this.times[index];
      if (time >= fromTime) {
        callback(time, this.values[index]);
      }
    }
  }

  summary(fromTime: number): SignalSeriesSummary {
    if (this.length === 0) {
      return { count: 0 };
    }
    let count = 0;
    let oldest = Number.POSITIVE_INFINITY;
    let newest = Number.NEGATIVE_INFINITY;
    this.forEach(fromTime, (time) => {
      count += 1;
      if (time < oldest) oldest = time;
      if (time > newest) newest = time;
    });
    if (count === 0) {
      return { count: 0 };
    }
    return {
      count,
      oldest,
      newest,
      lastTimestamp: this.latestTimestamp,
      lastValue: this.latestValue,
    };
  }
}

const clampRssi = (value: number) => Math.max(MIN_RSSI, Math.min(MAX_RSSI, value));

const getColorForIndex = (index: number) => {
  if (index < palette.length) {
    return palette[index];
  }
  const hue = Math.round((index * 47) % 360);
  return `hsl(${hue} 72% 58%)`;
};

const SignalGraph = (
  { className, durationMs = 60000, height = 208 }: SignalGraphProps,
  ref: ForwardedRef<SignalGraphHandle>,
) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cssWidthRef = useRef<number>(DEFAULT_WIDTH);
  const cssHeightRef = useRef<number>(height);
  const devicePixelRatioRef = useRef<number>(1);
  const buffersRef = useRef<Map<string, CircularSeries>>(new Map());
  const colorRef = useRef<Map<string, string>>(new Map());
  const legendOrderRef = useRef<string[]>([]);
  const [legendOrder, setLegendOrder] = useState<string[]>([]);
  const lastTimestampRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const ensureSeries = useCallback(
    (bssid: string) => {
      let series = buffersRef.current.get(bssid);
      if (!series) {
        const capacity = Math.max(512, Math.ceil(durationMs / 20));
        series = new CircularSeries(capacity);
        buffersRef.current.set(bssid, series);
        const nextColor = getColorForIndex(colorRef.current.size);
        colorRef.current.set(bssid, nextColor);
        legendOrderRef.current = legendOrderRef.current.includes(bssid)
          ? legendOrderRef.current
          : [...legendOrderRef.current, bssid];
        setLegendOrder(legendOrderRef.current);
      }
      return series;
    },
    [durationMs],
  );

  const valueToY = useCallback(
    (value: number) => {
      const normalized = (clampRssi(value) - MIN_RSSI) / (MAX_RSSI - MIN_RSSI);
      return cssHeightRef.current - normalized * cssHeightRef.current;
    },
    [],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const width = cssWidthRef.current || DEFAULT_WIDTH;
    const heightPx = cssHeightRef.current || height;

    context.clearRect(0, 0, width, heightPx);
    context.fillStyle = 'rgba(15, 23, 42, 0.9)';
    context.fillRect(0, 0, width, heightPx);

    const now = Math.max(lastTimestampRef.current, Date.now());
    const start = now - durationMs;

    // Grid lines for reference levels
    const gridLevels = [-90, -80, -70, -60, -50, -40, -30];
    context.lineWidth = 1;
    context.font = '10px var(--font-sans, ui-sans-serif, system-ui)';
    gridLevels.forEach((level) => {
      const y = valueToY(level);
      context.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
      context.fillStyle = 'rgba(148, 163, 184, 0.7)';
      context.fillText(`${level} dBm`, 6, Math.max(10, y - 2));
    });

    buffersRef.current.forEach((series, bssid) => {
      const color = colorRef.current.get(bssid) ?? '#38bdf8';
      const bucketCount = Math.max(1, Math.floor(width));
      const mins = new Float32Array(bucketCount);
      const maxs = new Float32Array(bucketCount);
      mins.fill(Number.POSITIVE_INFINITY);
      maxs.fill(Number.NEGATIVE_INFINITY);

      let hasData = false;
      series.forEach(start, (timestamp, value) => {
        if (timestamp < start || timestamp > now) return;
        const ratio = (timestamp - start) / durationMs;
        const bucketIndex = Math.min(
          bucketCount - 1,
          Math.max(0, Math.floor(ratio * bucketCount)),
        );
        const clamped = clampRssi(value);
        if (mins[bucketIndex] === Number.POSITIVE_INFINITY) {
          mins[bucketIndex] = clamped;
          maxs[bucketIndex] = clamped;
        } else {
          if (clamped < mins[bucketIndex]) mins[bucketIndex] = clamped;
          if (clamped > maxs[bucketIndex]) maxs[bucketIndex] = clamped;
        }
        hasData = true;
      });

      if (!hasData) {
        return;
      }

      context.strokeStyle = color;
      context.lineWidth = 1.5;
      context.beginPath();
      let started = false;
      const denom = bucketCount - 1 || 1;
      for (let i = 0; i < bucketCount; i += 1) {
        if (mins[i] === Number.POSITIVE_INFINITY) continue;
        const avg = (mins[i] + maxs[i]) / 2;
        const x = (i / denom) * width;
        const y = valueToY(avg);
        if (!started) {
          context.moveTo(x, y);
          started = true;
        } else {
          context.lineTo(x, y);
        }
      }
      context.stroke();

      context.lineWidth = 1;
      context.beginPath();
      for (let i = 0; i < bucketCount; i += 1) {
        if (mins[i] === Number.POSITIVE_INFINITY) continue;
        if (mins[i] === maxs[i]) continue;
        const x = (i / (bucketCount - 1 || 1)) * width;
        const yMin = valueToY(maxs[i]);
        const yMax = valueToY(mins[i]);
        context.moveTo(x, yMin);
        context.lineTo(x, yMax);
      }
      context.stroke();
    });

    context.fillStyle = 'rgba(148, 163, 184, 0.7)';
    context.fillText('Time →', width - 48, heightPx - 6);
  }, [durationMs, height, valueToY]);

  const scheduleDraw = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
  }, [draw]);

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement as HTMLElement | null;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const width = parent?.clientWidth || parent?.getBoundingClientRect?.().width || DEFAULT_WIDTH;
    cssWidthRef.current = width;
    cssHeightRef.current = height;
    devicePixelRatioRef.current = dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    const context = canvas.getContext('2d');
    if (context) {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    draw();
  }, [draw, height]);

  useEffect(() => {
    updateCanvasSize();
    const canvas = canvasRef.current;
    if (!canvas) return;

    let observer: ResizeObserver | undefined;
    const parent = canvas.parentElement as HTMLElement | null;
    if (typeof ResizeObserver !== 'undefined' && parent) {
      observer = new ResizeObserver(() => updateCanvasSize());
      observer.observe(parent);
    } else {
      const handler = () => updateCanvasSize();
      window.addEventListener('resize', handler);
      return () => {
        window.removeEventListener('resize', handler);
      };
    }

    return () => {
      observer?.disconnect();
    };
  }, [updateCanvasSize]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const pushSamples = useCallback(
    (samples: SignalSample[]) => {
      if (!samples.length) return;
      samples.forEach((sample) => {
        const series = ensureSeries(sample.bssid);
        const value = clampRssi(sample.rssi);
        series.push(sample.timestamp, value);
        const latest = Math.max(lastTimestampRef.current, sample.timestamp);
        lastTimestampRef.current = latest;
        series.prune(latest - durationMs);
      });
      scheduleDraw();
    },
    [durationMs, ensureSeries, scheduleDraw],
  );

  useImperativeHandle(
    ref,
    () => ({
      pushSample: (sample: SignalSample) => pushSamples([sample]),
      pushSamples,
      clear: () => {
        buffersRef.current.clear();
        colorRef.current.clear();
        legendOrderRef.current = [];
        setLegendOrder([]);
        lastTimestampRef.current = 0;
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width / devicePixelRatioRef.current, canvas.height / devicePixelRatioRef.current);
          }
        }
      },
      getSeriesSummary: (bssid: string) => {
        const series = buffersRef.current.get(bssid);
        if (!series) return undefined;
        const now = Math.max(lastTimestampRef.current, Date.now());
        return series.summary(now - durationMs);
      },
    }),
    [durationMs, pushSamples],
  );

  const legendItems = useMemo(
    () =>
      legendOrder.map((bssid) => ({
        bssid,
        color: colorRef.current.get(bssid) ?? '#38bdf8',
      })),
    [legendOrder],
  );

  return (
    <div className={clsx('w-full text-xs text-slate-200', className)}>
      <div className="relative" style={{ height }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="RSSI over the last 60 seconds"
        />
      </div>
      {legendItems.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {legendItems.map((item) => (
            <li key={item.bssid} className="flex items-center gap-1">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-mono tracking-tight">{item.bssid}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ForwardedSignalGraph = React.forwardRef(SignalGraph);
ForwardedSignalGraph.displayName = 'SignalGraph';

export default ForwardedSignalGraph;
