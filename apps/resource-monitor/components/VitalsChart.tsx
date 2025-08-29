'use client';

import React, { useEffect, useRef } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

const MAX_POINTS = 60;

type Metric = 'fps' | 'heap' | 'longtask' | 'paint';

const COLORS: Record<Metric, string> = {
  fps: '#00ffff',
  heap: '#ffd700',
  longtask: '#ff00ff',
  paint: '#00ff00',
};

const LABELS: Record<Metric, string> = {
  fps: 'FPS',
  heap: 'Heap (MB)',
  longtask: 'Long Tasks (ms)',
  paint: 'Paints',
};

export default function VitalsChart() {
  const [visible, setVisible] = usePersistentState<Record<Metric, boolean>>(
    'resource-monitor:vitals',
    { fps: true, heap: true, longtask: true, paint: true },
  );

  const visibleRef = useRef(visible);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const dataRef = useRef<Record<Metric, number[]>>({
    fps: [],
    heap: [],
    longtask: [],
    paint: [],
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;

    let frameCount = 0;
    let longTask = 0;
    let paints = 0;

    const frameObs = new PerformanceObserver((list) => {
      frameCount += list.getEntries().length;
    });
    try {
      frameObs.observe({ type: 'frame', buffered: true } as any);
    } catch {
      /* unsupported */
    }

    const longObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTask += entry.duration;
      }
    });
    try {
      longObs.observe({ type: 'longtask', buffered: true });
    } catch {
      /* unsupported */
    }

    const paintObs = new PerformanceObserver((list) => {
      paints += list.getEntries().length;
    });
    try {
      paintObs.observe({ type: 'paint', buffered: true });
    } catch {
      /* unsupported */
    }

    const push = (k: Metric, v: number) => {
      const arr = dataRef.current[k];
      arr.push(v);
      if (arr.length > MAX_POINTS) arr.shift();
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      (Object.keys(dataRef.current) as Metric[]).forEach((metric, idx) => {
        if (!visibleRef.current[metric]) return;
        const values = dataRef.current[metric];
        if (!values.length) return;
        const max = Math.max(...values, 1);
        ctx.strokeStyle = COLORS[metric];
        ctx.beginPath();
        values.forEach((v, i) => {
          const x = (i / (MAX_POINTS - 1)) * w;
          const y = h - (v / max) * h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        const latest = values[values.length - 1];
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px sans-serif';
        ctx.fillText(`${LABELS[metric]}: ${latest.toFixed(1)}`, 4, 12 + idx * 14);
      });
    };

    const sample = () => {
      const perf: any = performance;
      const heap = perf.memory ? perf.memory.usedJSHeapSize / 1048576 : 0;
      push('fps', frameCount);
      push('heap', heap);
      push('longtask', longTask);
      push('paint', paints);
      frameCount = 0;
      longTask = 0;
      paints = 0;
      draw();
    };

    const interval = setInterval(sample, 1000);

    return () => {
      clearInterval(interval);
      frameObs.disconnect();
      longObs.disconnect();
      paintObs.disconnect();
    };
  }, []);

  const toggle = (metric: Metric) => {
    setVisible({ ...visibleRef.current, [metric]: !visibleRef.current[metric] });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-sm">
        {(Object.keys(LABELS) as Metric[]).map((metric) => (
          <label key={metric} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={visible[metric]}
              onChange={() => toggle(metric)}
            />
            {LABELS[metric]}
          </label>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        role="img"
        aria-label="Vitals chart"
        className="bg-ub-dark-grey w-full h-48"
      />
    </div>
  );
}
