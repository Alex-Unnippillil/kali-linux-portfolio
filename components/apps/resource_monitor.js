import React, { useCallback, useEffect, useRef, useState } from 'react';

// Number of samples to keep in the timeline
const MAX_POINTS = 60;

const ResourceMonitor = () => {
  const cpuCanvas = useRef(null);
  const memCanvas = useRef(null);
  const fpsCanvas = useRef(null);
  const netCanvas = useRef(null);
  const workerRef = useRef(null);

  const dataRef = useRef({ cpu: [], mem: [], fps: [], net: [] });
  const displayRef = useRef({ cpu: [], mem: [], fps: [], net: [] });
  const animRef = useRef();
  const lastDrawRef = useRef(0);
  const THROTTLE_MS = 1000;

  const [paused, setPaused] = useState(false);
  const [stress, setStress] = useState(false);
  const [fps, setFps] = useState(0);
  const [themeTokens, setThemeTokens] = useState(() => ({
    cpu: '#0f94d2',
    mem: '#45ff9a',
    fps: '#38bdf8',
    net: '#f59e0b',
    label: '#f8fafc',
  }));

  const stressWindows = useRef([]);
  const stressEls = useRef([]);
  const containerRef = useRef(null);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  // Spawn worker for network speed tests
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker !== 'function') return;
    workerRef.current = new Worker(
      new URL('./speedtest.worker.js', import.meta.url),
    );
    workerRef.current.onmessage = (e) => {
      const { speed } = e.data || {};
      pushSample('net', speed);
      scheduleDraw();
    };
    workerRef.current.postMessage({ type: 'start' });
    return () => workerRef.current?.terminate();
  }, [scheduleDraw]);

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
        pushSample('cpu', cpu);
        pushSample('mem', mem);
        pushSample('fps', currentFps);
        scheduleDraw();
        lastSample = now;
      }
      raf = requestAnimationFrame(sample);
    };
    raf = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(raf);
  }, [paused, scheduleDraw]);

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

  const pushSample = (key, value) => {
    const arr = dataRef.current[key];
    arr.push(value);
    if (arr.length > MAX_POINTS) arr.shift();
  };

  const drawCharts = useCallback(
    (dataset = dataRef.current) => {
      drawChart(cpuCanvas.current, dataset.cpu, themeTokens.cpu, themeTokens.label, 'CPU %', 100);
      drawChart(memCanvas.current, dataset.mem, themeTokens.mem, themeTokens.label, 'Memory %', 100);
      drawChart(fpsCanvas.current, dataset.fps, themeTokens.fps, themeTokens.label, 'FPS', 120);
      drawChart(netCanvas.current, dataset.net, themeTokens.net, themeTokens.label, 'Mbps', 100);
    },
    [themeTokens],
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
    if (typeof window === 'undefined') return;
    const style = getComputedStyle(document.documentElement);
    setThemeTokens((prev) => ({
      cpu: style.getPropertyValue('--color-accent')?.trim() || prev.cpu,
      mem: style.getPropertyValue('--kali-terminal-green')?.trim() || prev.mem,
      fps: style.getPropertyValue('--color-info')?.trim() || prev.fps,
      net: style.getPropertyValue('--color-warning')?.trim() || prev.net,
      label: style.getPropertyValue('--kali-terminal-text')?.trim() || prev.label,
    }));
  }, []);

  useEffect(() => {
    scheduleDraw();
  }, [scheduleDraw]);

  const togglePause = () => setPaused((p) => !p);
  const toggleStress = () => setStress((s) => !s);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full flex flex-col bg-[color:var(--kali-panel)] text-white font-ubuntu overflow-hidden"
    >
      <div className="p-2 flex gap-2 items-center">
        <button
          onClick={togglePause}
          className="px-3 py-1.5 rounded border border-[color:var(--kali-panel-border)] bg-kali-control text-kali-inverse font-semibold transition-colors hover:bg-kali-control/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={toggleStress}
          className="px-3 py-1.5 rounded border border-[color:var(--kali-panel-border)] bg-kali-control text-kali-inverse font-semibold transition-colors hover:bg-kali-control/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-control focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
        >
          {stress ? 'Stop Stress' : 'Stress Test'}
        </button>
        <span className="ml-auto text-sm">FPS: {fps.toFixed(1)}</span>
      </div>
      <div className="flex flex-1 items-center justify-evenly gap-4 p-4">
        <canvas
          ref={cpuCanvas}
          width={300}
          height={100}
          role="img"
          aria-label="CPU usage chart"
          className="rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)]"
        />
        <canvas
          ref={memCanvas}
          width={300}
          height={100}
          role="img"
          aria-label="Memory usage chart"
          className="rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)]"
        />
        <canvas
          ref={fpsCanvas}
          width={300}
          height={100}
          role="img"
          aria-label="FPS chart"
          className="rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)]"
        />
        <canvas
          ref={netCanvas}
          width={300}
          height={100}
          role="img"
          aria-label="Network speed chart"
          className="rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)]"
        />
      </div>
      {stressWindows.current.map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            stressEls.current[i] = el;
          }}
          className="absolute h-6 w-8 rounded-sm border border-[color:color-mix(in_srgb,var(--kali-control)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-control)_24%,transparent)] shadow-[0_0_10px_rgba(15,148,210,0.35)] pointer-events-none"
        />
      ))}
    </div>
  );
};

function drawChart(canvas, values, strokeColor, labelColor, label, maxVal) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = strokeColor;
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
  ctx.fillStyle = labelColor;
  ctx.font = '12px sans-serif';
  ctx.fillText(`${label}: ${latest.toFixed(1)}`, 4, 12);
}

export default ResourceMonitor;

export const displayResourceMonitor = (addFolder, openApp) => (
  <ResourceMonitor addFolder={addFolder} openApp={openApp} />
);
