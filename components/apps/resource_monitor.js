import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const RANGE_OPTIONS = [1, 5, 15];
const MAX_HISTORY_MS = RANGE_OPTIONS[RANGE_OPTIONS.length - 1] * 60 * 1000;
const THROTTLE_MS = 1000;

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

  const [paused, setPaused] = useState(false);
  const [stress, setStress] = useState(false);
  const [fps, setFps] = useState(0);
  const [rangeMinutes, setRangeMinutes] = useState(RANGE_OPTIONS[0]);

  const coreCount = useMemo(
    () => (typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4),
    [],
  );
  const coreColors = useMemo(() => generateCoreColors(coreCount), [coreCount]);
  const perCoreRef = useRef(Array.from({ length: coreCount }, () => 0));

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
        const cpuAvg = Math.min(100, Math.max(0, ((dt - target) / target) * 100));
        let mem = 0;
        if (performance && performance.memory) {
          const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
          mem = (usedJSHeapSize / totalJSHeapSize) * 100;
        }
        const perCoreUsage = updatePerCoreUsage(perCoreRef.current, cpuAvg, coreCount);
        perCoreRef.current = perCoreUsage;
        pushSample('cpu', perCoreUsage);
        pushSample('mem', mem);
        pushSample('fps', currentFps);
        scheduleDraw();
        lastSample = now;
      }
      raf = requestAnimationFrame(sample);
    };
    raf = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(raf);
  }, [coreCount, paused, scheduleDraw]);

  useEffect(() => {
    scheduleDraw(true);
  }, [rangeMinutes, scheduleDraw]);

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
    const timestamp = Date.now();
    if (key === 'cpu') {
      const arr = dataRef.current.cpu;
      arr.push({ time: timestamp, values: value.slice() });
      trimTimedSamples(arr, timestamp);
    } else {
      const arr = dataRef.current[key];
      arr.push({ time: timestamp, value });
      trimTimedSamples(arr, timestamp);
    }
  };

  const drawCharts = (dataset = dataRef.current) => {
    drawCpuChart(cpuCanvas.current, dataset.cpu, coreColors);
    drawValueChart(memCanvas.current, dataset.mem, '#ffd700', 'Memory %', 100);
    drawValueChart(fpsCanvas.current, dataset.fps, '#00ffff', 'FPS', 120);
    drawValueChart(netCanvas.current, dataset.net, '#ff00ff', 'Mbps');
  };

  const animateCharts = useCallback(() => {
    const target = sliceDataForRange(dataRef.current, rangeMinutes);
    const from = cloneData(displayRef.current);
    const start = performance.now();
    const duration = 300;

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const interpolated = interpolateData(from, target, t, coreCount);
      drawCharts(interpolated);
      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        displayRef.current = cloneData(target);
      }
    };

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(step);
  }, [coreCount, rangeMinutes]);

  const scheduleDraw = useCallback(
    (force = false) => {
      const now = performance.now();
      if (force || now - lastDrawRef.current >= THROTTLE_MS) {
        lastDrawRef.current = now;
        animateCharts();
      }
    },
    [animateCharts],
  );

  const togglePause = () => setPaused((p) => !p);
  const toggleStress = () => setStress((s) => !s);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full flex flex-col bg-ub-cool-grey text-white font-ubuntu overflow-hidden"
    >
      <div className="p-2 flex flex-wrap gap-2 items-center">
        <button onClick={togglePause} className="px-2 py-1 bg-ub-dark-grey rounded">
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={toggleStress} className="px-2 py-1 bg-ub-dark-grey rounded">
          {stress ? 'Stop Stress' : 'Stress Test'}
        </button>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-gray-300">Range:</span>
            {RANGE_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                onClick={() => setRangeMinutes(minutes)}
                className={`px-2 py-1 rounded border border-gray-700 transition-colors ${
                  rangeMinutes === minutes
                    ? 'bg-ub-orange text-black'
                    : 'bg-ub-dark-grey text-gray-200 hover:bg-ub-grey'
                }`}
              >
                {minutes}m
              </button>
            ))}
          </div>
          <span className="text-sm">FPS: {fps.toFixed(1)}</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col">
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
        <div className="px-4 pb-3">
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-gray-300">
            {coreColors.map((color, index) => (
              <div key={color + index} className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                <span>Core {index + 1}</span>
              </div>
            ))}
          </div>
        </div>
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

function trimTimedSamples(samples, now) {
  while (samples.length && now - samples[0].time > MAX_HISTORY_MS) {
    samples.shift();
  }
}

function sliceDataForRange(data, minutes) {
  const cutoff = Date.now() - minutes * 60 * 1000;
  return {
    cpu: data.cpu
      .filter((sample) => sample.time >= cutoff)
      .map((sample) => ({ time: sample.time, values: sample.values.slice() })),
    mem: data.mem
      .filter((sample) => sample.time >= cutoff)
      .map((sample) => ({ time: sample.time, value: sample.value })),
    fps: data.fps
      .filter((sample) => sample.time >= cutoff)
      .map((sample) => ({ time: sample.time, value: sample.value })),
    net: data.net
      .filter((sample) => sample.time >= cutoff)
      .map((sample) => ({ time: sample.time, value: sample.value })),
  };
}

function cloneData(data) {
  return {
    cpu: (data.cpu || []).map((sample) => ({
      time: sample.time,
      values: sample.values.slice(),
    })),
    mem: (data.mem || []).map((sample) => ({ time: sample.time, value: sample.value })),
    fps: (data.fps || []).map((sample) => ({ time: sample.time, value: sample.value })),
    net: (data.net || []).map((sample) => ({ time: sample.time, value: sample.value })),
  };
}

function interpolateValueSeries(fromSeries, toSeries, t) {
  const lerp = (a, b) => a + (b - a) * t;
  return toSeries.map((sample, index) => {
    const prev = fromSeries[index] || fromSeries[fromSeries.length - 1];
    const start = prev ? prev.value : 0;
    return {
      time: sample.time,
      value: lerp(start, sample.value),
    };
  });
}

function interpolateData(from, to, t, coreCount) {
  const lerp = (a, b) => a + (b - a) * t;
  const cpu = to.cpu.map((sample, index) => {
    const prev = from.cpu[index] || from.cpu[from.cpu.length - 1];
    const baseline = prev ? prev.values : [];
    const values = sample.values.map((value, coreIdx) => {
      const start = baseline[coreIdx] ?? baseline[baseline.length - 1] ?? 0;
      return lerp(start, value);
    });
    return { time: sample.time, values };
  });
  return {
    cpu,
    mem: interpolateValueSeries(from.mem, to.mem, t),
    fps: interpolateValueSeries(from.fps, to.fps, t),
    net: interpolateValueSeries(from.net, to.net, t),
  };
}

function drawGrid(ctx, w, h) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i += 1) {
    const y = (h / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCpuChart(canvas, samples, colors) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  drawGrid(ctx, w, h);

  if (samples.length === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.fillText('CPU Avg: —', 4, 12);
    return;
  }

  const seriesCount = colors.length;
  for (let core = 0; core < seriesCount; core += 1) {
    ctx.strokeStyle = colors[core % colors.length];
    ctx.lineWidth = 2;
    ctx.beginPath();
    samples.forEach((sample, index) => {
      const values = sample.values || [];
      const value = values[core] ?? values[values.length - 1] ?? 0;
      const x = (index / (samples.length - 1 || 1)) * w;
      const y = h - (value / 100) * h;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  const latest = samples[samples.length - 1];
  const average =
    latest.values.reduce((sum, value) => sum + value, 0) /
    (latest.values.length || 1);
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`CPU Avg: ${average.toFixed(1)}%`, 4, 12);
}

function drawValueChart(canvas, samples, color, label, maxVal) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  drawGrid(ctx, w, h);

  if (samples.length === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${label}: —`, 4, 12);
    return;
  }

  const values = samples.map((sample) => sample.value);
  const maxValue = typeof maxVal === 'number' ? maxVal : Math.max(...values, 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((value, index) => {
    const clamped = Math.min(value, maxValue);
    const x = (index / (values.length - 1 || 1)) * w;
    const y = h - (clamped / maxValue) * h;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  const latest = values[values.length - 1];
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`${label}: ${latest.toFixed(1)}`, 4, 12);
}

function updatePerCoreUsage(previous, average, count) {
  const baseline = Array.from({ length: count }, (_, idx) => previous[idx] ?? average);
  return baseline.map((value) => {
    const drift = (average - value) * 0.25;
    const noise = (Math.random() - 0.5) * 8;
    return clamp(value + drift + noise, 0, 100);
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function generateCoreColors(count) {
  const palette = [
    '#16a34a',
    '#22d3ee',
    '#facc15',
    '#f97316',
    '#3b82f6',
    '#ec4899',
    '#14b8a6',
    '#f59e0b',
    '#a855f7',
    '#38bdf8',
  ];
  if (count <= palette.length) return palette.slice(0, count);
  const colors = palette.slice();
  for (let i = palette.length; i < count; i += 1) {
    const hue = Math.round((i / count) * 360);
    colors.push(`hsl(${hue}, 70%, 55%)`);
  }
  return colors;
}

export default ResourceMonitor;

export const displayResourceMonitor = (addFolder, openApp) => (
  <ResourceMonitor addFolder={addFolder} openApp={openApp} />
);
