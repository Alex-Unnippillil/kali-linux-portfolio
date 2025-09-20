import React, { useEffect, useRef, useState } from 'react';
import { hasOffscreenCanvas } from '../../utils/feature';

const createEmptyStats = () => ({
  latest: 0,
  average: 0,
  min: 0,
  max: 0,
  windowAverage: 0,
  windowMin: 0,
  windowMax: 0,
  trend: 0,
  count: 0,
});

const METRIC_CONFIG = [
  { key: 'cpu', label: 'CPU', suffix: '%', precision: 1, color: '#00ff00' },
  { key: 'memory', label: 'Memory', suffix: '%', precision: 1, color: '#ffd700' },
  { key: 'down', label: 'Download', suffix: 'Mbps', precision: 2, color: '#00ffff' },
  { key: 'up', label: 'Upload', suffix: 'Mbps', precision: 2, color: '#ff00ff' },
];

const toNumber = (value, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const isSameLatest = (a, b) =>
  a.cpu === b.cpu && a.memory === b.memory && a.down === b.down && a.up === b.up;

const formatMetric = (value, precision, suffix) => {
  const numeric = Number.isFinite(value) ? value : 0;
  const formatted = numeric.toFixed(precision);
  if (!suffix) return formatted;
  if (suffix === '%') return `${formatted}${suffix}`;
  return `${formatted} ${suffix}`;
};

const ResourceMonitor = () => {
  const cpuCanvas = useRef(null);
  const memCanvas = useRef(null);
  const netCanvas = useRef(null);
  const containerRef = useRef(null);
  const monitorWorkerRef = useRef(null);
  const stressWindows = useRef([]);
  const stressEls = useRef([]);
  const latestRef = useRef({ cpu: 0, memory: 0, down: 0, up: 0 });
  const supportsOffscreenRef = useRef(false);

  const [paused, setPaused] = useState(false);
  const [stress, setStress] = useState(false);
  const [fps, setFps] = useState(0);
  const [summary, setSummary] = useState({
    cpu: createEmptyStats(),
    memory: createEmptyStats(),
    down: createEmptyStats(),
    up: createEmptyStats(),
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.__playwright_mainThreadWork = [];
    return () => {
      window.__playwright_mainThreadWork = [];
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker !== 'function') return undefined;

    const offscreenSupported = hasOffscreenCanvas();
    supportsOffscreenRef.current = offscreenSupported;
    const worker = new Worker(new URL('./resource_monitor.worker.js', import.meta.url));
    monitorWorkerRef.current = worker;

    const reduceMotionQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    const reduceMotion = !!reduceMotionQuery?.matches;

    const canvases = {};
    const transfers = [];
    if (offscreenSupported && cpuCanvas.current && 'transferControlToOffscreen' in cpuCanvas.current) {
      const canvas = cpuCanvas.current.transferControlToOffscreen();
      canvases.cpu = canvas;
      transfers.push(canvas);
    }
    if (offscreenSupported && memCanvas.current && 'transferControlToOffscreen' in memCanvas.current) {
      const canvas = memCanvas.current.transferControlToOffscreen();
      canvases.memory = canvas;
      transfers.push(canvas);
    }
    if (offscreenSupported && netCanvas.current && 'transferControlToOffscreen' in netCanvas.current) {
      const canvas = netCanvas.current.transferControlToOffscreen();
      canvases.network = canvas;
      transfers.push(canvas);
    }

    const initPayload = { type: 'init', canvases, reduceMotion };
    if (transfers.length > 0) worker.postMessage(initPayload, transfers);
    else worker.postMessage(initPayload);
    worker.postMessage({ type: 'decimate', value: reduceMotion ? 2 : 1 });
    worker.postMessage({ type: 'visibility', hidden: document.visibilityState === 'hidden' });

    worker.onmessage = (event) => {
      const { type, summary: summaryData, latest: latestSample } = event.data || {};
      if (type !== 'summary' || !summaryData) return;
      const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
      setSummary(summaryData);
      let nextLatest = latestRef.current;
      if (latestSample && typeof latestSample === 'object') {
        nextLatest = {
          cpu: toNumber(latestSample.cpu, latestRef.current.cpu),
          memory: toNumber(latestSample.memory, latestRef.current.memory),
          down: toNumber(latestSample.down, latestRef.current.down),
          up: toNumber(latestSample.up, latestRef.current.up),
        };
        if (!isSameLatest(latestRef.current, nextLatest)) {
          latestRef.current = nextLatest;
        }
      }
      if (!supportsOffscreenRef.current) {
        drawFallbackCharts(
          {
            cpu: cpuCanvas.current,
            memory: memCanvas.current,
            network: netCanvas.current,
          },
          summaryData,
          nextLatest,
        );
      }
      if (typeof window !== 'undefined') {
        const store = (window.__playwright_mainThreadWork = window.__playwright_mainThreadWork || []);
        const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
        store.push(end - start);
        if (store.length > 120) store.shift();
      }
    };

    const handleVisibility = () => {
      worker.postMessage({ type: 'visibility', hidden: document.visibilityState === 'hidden' });
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleMotionChange = (event) => {
      worker.postMessage({ type: 'decimate', value: event.matches ? 2 : 1 });
    };
    if (reduceMotionQuery) {
      if (typeof reduceMotionQuery.addEventListener === 'function') {
        reduceMotionQuery.addEventListener('change', handleMotionChange);
      } else if (typeof reduceMotionQuery.addListener === 'function') {
        reduceMotionQuery.addListener(handleMotionChange);
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (reduceMotionQuery) {
        if (typeof reduceMotionQuery.removeEventListener === 'function') {
          reduceMotionQuery.removeEventListener('change', handleMotionChange);
        } else if (typeof reduceMotionQuery.removeListener === 'function') {
          reduceMotionQuery.removeListener(handleMotionChange);
        }
      }
      worker.terminate();
      monitorWorkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!monitorWorkerRef.current) return;
    monitorWorkerRef.current.postMessage({ type: 'pause', value: paused });
  }, [paused]);

  useEffect(() => {
    if (!monitorWorkerRef.current) return;
    monitorWorkerRef.current.postMessage({ type: 'stress', value: stress });
  }, [stress]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let raf;
    let last = performance.now();
    let lastUpdate = last;
    const measure = (now) => {
      const dt = now - last;
      last = now;
      if (!paused && dt > 0 && now - lastUpdate >= 500) {
        setFps(1000 / dt);
        lastUpdate = now;
      }
      raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  useEffect(() => {
    let raf;
    const animate = () => {
      if (stress && !paused) {
        const rect = containerRef.current?.getBoundingClientRect();
        stressWindows.current.forEach((w, i) => {
          w.x += w.vx;
          w.y += w.vy;
          if (rect) {
            if (w.x < 0 || w.x > rect.width - 20) w.vx *= -1;
            if (w.y < 0 || w.y > rect.height - 20) w.vy *= -1;
          }
          const el = stressEls.current[i];
          if (el) el.style.transform = `translate(${w.x}px, ${w.y}px)`;
        });
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [stress, paused]);

  useEffect(() => {
    if (stress) {
      const rect = containerRef.current?.getBoundingClientRect();
      const width = rect?.width || 300;
      const height = rect?.height || 200;
      stressWindows.current = Array.from({ length: 40 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
      }));
    } else {
      stressWindows.current = [];
      stressEls.current = [];
    }
  }, [stress]);

  const togglePause = () => setPaused((p) => !p);
  const toggleStress = () => setStress((s) => !s);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full flex flex-col bg-ub-cool-grey text-white font-ubuntu overflow-hidden"
    >
      <div className="p-2 flex gap-2 items-center">
        <button onClick={togglePause} className="px-2 py-1 bg-ub-dark-grey rounded">
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={toggleStress} className="px-2 py-1 bg-ub-dark-grey rounded">
          {stress ? 'Stop Stress' : 'Stress Test'}
        </button>
        <span className="ml-auto text-sm">FPS: {fps.toFixed(1)}</span>
      </div>
      <div className="flex flex-1 flex-wrap items-center justify-evenly gap-4 p-4">
        <canvas
          ref={cpuCanvas}
          width={300}
          height={100}
          role="img"
          aria-label="CPU usage chart"
          className="bg-ub-dark-grey"
        />
        <canvas
          ref={memCanvas}
          width={300}
          height={100}
          role="img"
          aria-label="Memory usage chart"
          className="bg-ub-dark-grey"
        />
        <canvas
          ref={netCanvas}
          width={300}
          height={100}
          role="img"
          aria-label="Network speed chart"
          className="bg-ub-dark-grey"
        />
      </div>
      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {METRIC_CONFIG.map((metric) => {
          const stats = summary[metric.key] || createEmptyStats();
          return (
            <div
              key={metric.key}
              className="rounded border border-gray-700 bg-ub-dark-grey px-3 py-2 shadow-inner"
            >
              <div className="flex items-baseline justify-between">
                <span className="uppercase tracking-wide text-[10px] text-gray-400">
                  {metric.label}
                </span>
                <span className="font-semibold text-sm">
                  {formatMetric(stats.latest, metric.precision, metric.suffix)}
                </span>
              </div>
              <div className="mt-1 text-[10px] leading-relaxed text-gray-400">
                <div>
                  Avg: {formatMetric(stats.average, metric.precision, metric.suffix)}
                </div>
                <div>
                  Window: {formatMetric(stats.windowAverage, metric.precision, metric.suffix)}
                </div>
                <div>
                  Max: {formatMetric(stats.max, metric.precision, metric.suffix)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {stressWindows.current.map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            stressEls.current[i] = el;
          }}
          className="absolute w-8 h-6 bg-white bg-opacity-20 border border-gray-500 pointer-events-none"
        />
      ))}
    </div>
  );
};

function drawFallbackCharts(canvases, summary, latest) {
  if (!latest) return;
  drawFallbackBar(canvases.cpu, latest.cpu, 'CPU', '#00ff00', 100);
  drawFallbackBar(canvases.memory, latest.memory, 'Memory', '#ffd700', 100);
  drawFallbackNetwork(
    canvases.network,
    latest.down,
    latest.up,
    summary?.down?.max ?? 0,
    summary?.up?.max ?? 0,
  );
}

function drawFallbackBar(canvas, value, label, color, maxValue) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);
  const safeValue = Number.isFinite(value) ? value : 0;
  const safeMax = maxValue > 0 ? maxValue : 100;
  const ratio = Math.max(0, Math.min(1, safeValue / safeMax));
  const barWidth = ratio * w;
  ctx.fillStyle = color;
  ctx.fillRect(0, h - 18, barWidth, 16);
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`${label}: ${safeValue.toFixed(1)}`, 4, 14);
}

function drawFallbackNetwork(canvas, down, up, downMax, upMax) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);
  const safeDown = Number.isFinite(down) ? down : 0;
  const safeUp = Number.isFinite(up) ? up : 0;
  const safeDownMax = Number.isFinite(downMax) && downMax > 0 ? downMax : 0;
  const safeUpMax = Number.isFinite(upMax) && upMax > 0 ? upMax : 0;
  const maxVal = Math.max(safeDownMax, safeUpMax, safeDown, safeUp, 1);
  const downRatio = Math.max(0, Math.min(1, safeDown / maxVal));
  const upRatio = Math.max(0, Math.min(1, safeUp / maxVal));
  ctx.fillStyle = '#00ffff';
  ctx.fillRect(0, h / 2 - 18, downRatio * w, 16);
  ctx.fillStyle = '#ff00ff';
  ctx.fillRect(0, h / 2 + 2, upRatio * w, 16);
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Down: ${safeDown.toFixed(1)} Mbps`, 4, 14);
  ctx.fillText(`Up: ${safeUp.toFixed(1)} Mbps`, 4, h - 6);
}

export default ResourceMonitor;

export const displayResourceMonitor = (addFolder, openApp) => (
  <ResourceMonitor addFolder={addFolder} openApp={openApp} />
);
