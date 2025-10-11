import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  calculateFps,
  extractMemoryStats,
  normalizeCpuDuration,
  rollingAverage,
  METRIC_BASELINES,
} from './resource_monitor.metrics';

// Number of samples to keep in the timeline
const MAX_POINTS = 60;
const CPU_PROBE_ITERATIONS = 60000;

const ResourceMonitor = () => {
  const cpuCanvas = useRef(null);
  const memCanvas = useRef(null);
  const fpsCanvas = useRef(null);
  const netCanvas = useRef(null);
  const netWorkerRef = useRef(null);
  const cpuWorkerRef = useRef(null);

  const dataRef = useRef({ cpu: [], mem: [], fps: [], net: [] });
  const displayRef = useRef({ cpu: [], mem: [], fps: [], net: [] });
  const animRef = useRef();
  const lastDrawRef = useRef(0);
  const THROTTLE_MS = 1000;

  const [paused, setPaused] = useState(false);
  const [stress, setStress] = useState(false);
  const [fps, setFps] = useState(0);
  const [memoryStats, setMemoryStats] = useState(() => extractMemoryStats());

  const stressWindows = useRef([]);
  const stressEls = useRef([]);
  const containerRef = useRef(null);
  const fpsBufferRef = useRef([]);
  const memoryStatsRef = useRef(memoryStats);
  const pausedRef = useRef(paused);

  const pushSample = useCallback((key, value) => {
    const arr = dataRef.current[key];
    arr.push(value);
    if (arr.length > MAX_POINTS) arr.shift();
  }, []);

  const drawCharts = useCallback(
    (dataset = dataRef.current) => {
      drawChart(cpuCanvas.current, dataset.cpu, '#00ff00', 'Synthetic CPU %', 100);
      drawChart(memCanvas.current, dataset.mem, '#ffd700', 'Memory %', 100);
      drawChart(fpsCanvas.current, dataset.fps, '#00ffff', 'FPS', 144);
      drawChart(netCanvas.current, dataset.net, '#ff00ff', 'Mbps', 100);
    },
    [],
  );

  const animateCharts = useCallback(() => {
    const from = { ...displayRef.current };
    const to = { ...dataRef.current };
    const start = performance.now();
    const duration = 300;

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const interpolated = {};
      ['cpu', 'mem', 'fps', 'net'].forEach((key) => {
        const fromArr = from[key];
        const toArr = to[key];
        interpolated[key] = toArr.map((v, i) => {
          const a = fromArr[i] ?? fromArr[fromArr.length - 1] ?? 0;
          return a + (v - a) * t;
        });
      });
      drawCharts(interpolated);
      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        displayRef.current = to;
      }
    };

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(step);
  }, [drawCharts]);

  const scheduleDraw = useCallback(() => {
    const now = performance.now();
    if (now - lastDrawRef.current >= THROTTLE_MS) {
      lastDrawRef.current = now;
      animateCharts();
    }
  }, [animateCharts]);

  useEffect(() => {
    if (paused) {
      fpsBufferRef.current = [];
    }
  }, [paused]);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    memoryStatsRef.current = memoryStats;
  }, [memoryStats]);

  // Spawn worker for network speed tests
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker !== 'function') return undefined;
    const worker = new Worker(new URL('./speedtest.worker.js', import.meta.url));
    netWorkerRef.current = worker;
    worker.onmessage = (e) => {
      const { speed } = e.data || {};
      if (!pausedRef.current) {
        pushSample('net', speed);
        scheduleDraw();
      }
    };
    worker.postMessage({ type: 'start' });
    return () => worker.terminate();
  }, [pushSample, scheduleDraw]);

  useEffect(() => {
    if (netWorkerRef.current) {
      netWorkerRef.current.postMessage({ type: paused ? 'stop' : 'start' });
    }
  }, [paused]);

  useEffect(() => {
    if (cpuWorkerRef.current) {
      cpuWorkerRef.current.postMessage({ type: paused ? 'stop' : 'start' });
    }
  }, [paused]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let raf;
    let lastFrame = performance.now();
    let lastSample = lastFrame;

    const loop = (now) => {
      const delta = now - lastFrame;
      lastFrame = now;

      if (!pausedRef.current) {
        const instantFps = calculateFps(delta);
        if (Number.isFinite(instantFps) && instantFps > 0) {
          fpsBufferRef.current.push(instantFps);
          if (fpsBufferRef.current.length > MAX_POINTS) fpsBufferRef.current.shift();
        }
        const averageFps = rollingAverage(fpsBufferRef.current);
        setFps(averageFps);

        if (now - lastSample >= 1000) {
          const perfMemory = typeof performance !== 'undefined' ? performance.memory : undefined;
          const stats = extractMemoryStats(perfMemory);
          const prev = memoryStatsRef.current;
          const changed =
            !prev ||
            prev.usedMB !== stats.usedMB ||
            prev.totalMB !== stats.totalMB ||
            prev.limitMB !== stats.limitMB ||
            prev.usagePercent !== stats.usagePercent ||
            prev.supported !== stats.supported;
          memoryStatsRef.current = stats;
          if (changed) {
            setMemoryStats(stats);
          }
          pushSample('fps', averageFps);
          if (stats.supported) {
            pushSample('mem', stats.usagePercent);
          }
          scheduleDraw();
          lastSample = now;
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pushSample, scheduleDraw]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker !== 'function') return undefined;
    const worker = new Worker(new URL('./resource_monitor.worker.js', import.meta.url));
    cpuWorkerRef.current = worker;
    worker.onmessage = (event) => {
      const { type, duration, baselineMs, memory } = event.data || {};
      if (type !== 'probe') return;
      if (memory) {
        const stats = extractMemoryStats(memory);
        const prev = memoryStatsRef.current;
        const changed =
          !prev ||
          prev.usedMB !== stats.usedMB ||
          prev.totalMB !== stats.totalMB ||
          prev.limitMB !== stats.limitMB ||
          prev.usagePercent !== stats.usagePercent ||
          prev.supported !== stats.supported;
        memoryStatsRef.current = stats;
        if (!pausedRef.current && changed) {
          setMemoryStats(stats);
        }
      }
      if (pausedRef.current) return;
      const percent = normalizeCpuDuration(duration, baselineMs || METRIC_BASELINES.cpuProbeBaselineMs);
      pushSample('cpu', percent);
      scheduleDraw();
    };
    worker.postMessage({
      type: 'start',
      intervalMs: 1000,
      iterations: CPU_PROBE_ITERATIONS,
      baselineMs: METRIC_BASELINES.cpuProbeBaselineMs,
    });
    return () => worker.terminate();
  }, [pushSample, scheduleDraw]);

  // Stress test animation – many moving windows
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

  // Create or clear stress windows when toggled
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
        <div className="ml-auto flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-100">
          <span>FPS: {fps.toFixed(1)}</span>
          <span>
            Memory:{' '}
            {memoryStats.supported
              ? `${memoryStats.usedMB.toFixed(1)} / ${Math.max(
                  memoryStats.limitMB,
                  memoryStats.totalMB,
                ).toFixed(1)} MB (${memoryStats.usagePercent.toFixed(1)}%)`
              : 'performance.memory unsupported'}
          </span>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-evenly gap-4 p-4">
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
          ref={fpsCanvas}
          width={300}
          height={100}
          role="img"
          aria-label="FPS chart"
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
      <div className="px-4 pb-4 text-xs text-gray-200 space-y-2">
        <p className="uppercase tracking-wide text-[10px] text-gray-300">Metric notes</p>
        <p>
          Synthetic CPU load measures how long a dedicated worker takes to crunch{' '}
          {CPU_PROBE_ITERATIONS.toLocaleString()} floating-point iterations relative to a{' '}
          {METRIC_BASELINES.cpuProbeBaselineMs.toFixed(1)}ms baseline. Higher percentages mean slower loop execution.
        </p>
        <p>
          FPS is sampled with <code>requestAnimationFrame</code> and averaged across the last {MAX_POINTS} frames to smooth out
          jitter. Memory statistics come directly from <code>performance.memory</code> when the browser exposes it; values
          include current heap usage, the active allocation pool, and the runtime cap.
        </p>
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

function drawChart(canvas, values, color, label, maxVal) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = (i / (values.length - 1 || 1)) * w;
    const y = h - (v / maxVal) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  const latest = values[values.length - 1] || 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`${label}: ${latest.toFixed(1)}`, 4, 12);
}

export default ResourceMonitor;

export const displayResourceMonitor = (addFolder, openApp) => (
  <ResourceMonitor addFolder={addFolder} openApp={openApp} />
);
