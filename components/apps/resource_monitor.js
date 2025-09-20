import React, { useCallback, useEffect, useRef, useState } from 'react';
import Charts from './resource-monitor/Charts';

// Number of samples to keep in the timeline
const MAX_POINTS = 60;

const INITIAL_SERIES_STATE = {
  cpu: [],
  memory: [],
  disk: [],
  network: [],
};

const ResourceMonitor = () => {
  const workerRef = useRef(null);
  const dataRef = useRef({ cpu: [], mem: [], disk: [], net: [] });

  const [chartData, setChartData] = useState(() => ({ ...INITIAL_SERIES_STATE }));
  const [paused, setPaused] = useState(false);
  const [stress, setStress] = useState(false);
  const [fps, setFps] = useState(0);

  const diskTrendRef = useRef(35);
  const stressWindows = useRef([]);
  const stressEls = useRef([]);
  const containerRef = useRef(null);

  const updateCharts = useCallback(() => {
    setChartData({
      cpu: [...dataRef.current.cpu],
      memory: [...dataRef.current.mem],
      disk: [...dataRef.current.disk],
      network: [...dataRef.current.net],
    });
  }, []);

  const pushSample = useCallback((key, value) => {
    const arr = dataRef.current[key];
    arr.push(value);
    if (arr.length > MAX_POINTS) arr.shift();
  }, []);

  const computeDiskUsage = useCallback((cpuValue, memValue) => {
    const next =
      diskTrendRef.current +
      (cpuValue - 50) * 0.05 +
      (memValue - 50) * 0.02 +
      (Math.random() - 0.5) * 4;
    diskTrendRef.current = Math.min(100, Math.max(0, next));
    return diskTrendRef.current;
  }, []);

  // Spawn worker for network speed tests
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker !== 'function') return undefined;
    workerRef.current = new Worker(new URL('./speedtest.worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const { speed } = e.data || {};
      pushSample('net', speed);
      updateCharts();
    };
    workerRef.current.postMessage({ type: 'start' });
    return () => workerRef.current?.terminate();
  }, [pushSample, updateCharts]);

  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: paused ? 'stop' : 'start' });
    }
  }, [paused]);

  // Sampling loop using requestAnimationFrame
  useEffect(() => {
    let raf;
    let lastFrame = performance.now();
    let lastSample = performance.now();

    const sample = (now) => {
      const dt = now - lastFrame;
      lastFrame = now;
      const currentFps = 1000 / dt;
      if (!paused) setFps(currentFps);

      if (!paused && now - lastSample >= 1000) {
        const target = 1000 / 60; // 60 FPS ideal frame time
        const cpu = Math.min(100, Math.max(0, ((dt - target) / target) * 100));
        let mem = 0;
        if (performance && performance.memory) {
          const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
          mem = (usedJSHeapSize / totalJSHeapSize) * 100;
        }
        const disk = computeDiskUsage(cpu, mem);
        pushSample('cpu', cpu);
        pushSample('mem', mem);
        pushSample('disk', disk);
        updateCharts();
        lastSample = now;
      }
      raf = requestAnimationFrame(sample);
    };
    raf = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(raf);
  }, [paused, computeDiskUsage, pushSample, updateCharts]);

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
      className="relative flex h-full w-full flex-col overflow-hidden bg-ub-cool-grey font-ubuntu text-white"
    >
      <div className="flex items-center gap-2 p-2">
        <button onClick={togglePause} className="rounded bg-ub-dark-grey px-2 py-1">
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={toggleStress} className="rounded bg-ub-dark-grey px-2 py-1">
          {stress ? 'Stop Stress' : 'Stress Test'}
        </button>
        <span className="ml-auto text-sm">FPS: {fps.toFixed(1)}</span>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Charts data={chartData} />
      </div>
      {stressWindows.current.map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            stressEls.current[i] = el;
          }}
          className="pointer-events-none absolute h-6 w-8 border border-gray-500 bg-white bg-opacity-20"
        />
      ))}
    </div>
  );
};

export default ResourceMonitor;

export const displayResourceMonitor = (addFolder, openApp) => (
  <ResourceMonitor addFolder={addFolder} openApp={openApp} />
);
