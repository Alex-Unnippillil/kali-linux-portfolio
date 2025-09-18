import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import { NotificationsContext } from '../common/NotificationCenter';
import Modal from '../base/Modal';

// Number of samples to keep in the timeline
const MAX_POINTS = 60;
const LOG_SIZE = 40;
const METRICS = ['cpu', 'mem'];

export const DEFAULT_THRESHOLDS = Object.freeze({
  cpu: { limit: 85, debounceMs: 5000 },
  mem: { limit: 80, debounceMs: 5000 },
});

export const validateThresholds = (value) => {
  if (!value || typeof value !== 'object') return false;
  return METRICS.every((metric) => {
    const entry = value[metric];
    return (
      entry &&
      typeof entry === 'object' &&
      typeof entry.limit === 'number' &&
      Number.isFinite(entry.limit) &&
      typeof entry.debounceMs === 'number' &&
      Number.isFinite(entry.debounceMs)
    );
  });
};

export const pushRingBuffer = (buffer, entry, limit) => {
  const next = [...buffer, entry];
  if (limit <= 0) return next.slice(-1);
  if (next.length > limit) {
    return next.slice(next.length - limit);
  }
  return next;
};

export const createAlertManager = (thresholds, onAlert, now = () => Date.now()) => {
  const state = {};
  METRICS.forEach((metric) => {
    state[metric] = { active: false, cooldownUntil: 0 };
  });

  const evaluate = (values) => {
    METRICS.forEach((metric) => {
      const config = thresholds[metric];
      if (!config) return;
      const value = values[metric];
      if (typeof value !== 'number' || Number.isNaN(value)) return;
      const slot = state[metric];
      const time = now();
      if (value >= config.limit) {
        if (!slot.active && time >= slot.cooldownUntil) {
          slot.active = true;
          slot.cooldownUntil = time + config.debounceMs;
          onAlert?.({ metric, value, limit: config.limit, timestamp: time });
        }
      } else {
        slot.active = false;
      }
    });
  };

  const reset = () => {
    METRICS.forEach((metric) => {
      state[metric].active = false;
      state[metric].cooldownUntil = 0;
    });
  };

  return { evaluate, reset };
};

const createDefaultThresholds = () => ({
  cpu: { ...DEFAULT_THRESHOLDS.cpu },
  mem: { ...DEFAULT_THRESHOLDS.mem },
});

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const createDraft = (config) => ({
  cpu: {
    limit: String(config.cpu?.limit ?? DEFAULT_THRESHOLDS.cpu.limit),
    debounceMs: String(config.cpu?.debounceMs ?? DEFAULT_THRESHOLDS.cpu.debounceMs),
  },
  mem: {
    limit: String(config.mem?.limit ?? DEFAULT_THRESHOLDS.mem.limit),
    debounceMs: String(config.mem?.debounceMs ?? DEFAULT_THRESHOLDS.mem.debounceMs),
  },
});

const metricLabel = {
  cpu: 'CPU',
  mem: 'Memory',
};

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
  const [thresholds, setThresholds] = usePersistentState(
    'resource-thresholds',
    createDefaultThresholds,
    validateThresholds,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState(() => createDraft(thresholds));
  const [logEntries, setLogEntries] = useState([]);

  const stressWindows = useRef([]);
  const stressEls = useRef([]);
  const containerRef = useRef(null);
  const logRef = useRef([]);
  const notifications = useContext(NotificationsContext);

  useEffect(() => {
    if (settingsOpen) {
      setDraft(createDraft(thresholds));
    }
  }, [settingsOpen, thresholds]);

  const appendLog = useCallback((message, timestamp = Date.now()) => {
    const entry = {
      id: `${timestamp}-${Math.random()}`,
      message,
      timestamp,
    };
    const next = pushRingBuffer(logRef.current, entry, LOG_SIZE);
    logRef.current = next;
    setLogEntries(next);
  }, []);

  const clearLog = useCallback(() => {
    logRef.current = [];
    setLogEntries([]);
  }, []);

  const handleAlert = useCallback(
    ({ metric, value, limit, timestamp }) => {
      const label = metricLabel[metric] || metric.toUpperCase();
      const message = `${label} usage high: ${value.toFixed(1)}% (limit ${limit}%)`;
      notifications?.pushNotification?.('resource-monitor', message);
      appendLog(message, timestamp);
    },
    [notifications, appendLog],
  );

  const alertManagerRef = useRef(createAlertManager(thresholds, handleAlert));

  useEffect(() => {
    alertManagerRef.current = createAlertManager(thresholds, handleAlert);
  }, [thresholds, handleAlert]);

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
        alertManagerRef.current?.evaluate({ cpu, mem });
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

  const drawCharts = (dataset = dataRef.current) => {
    drawChart(cpuCanvas.current, dataset.cpu, '#00ff00', 'CPU %', 100);
    drawChart(memCanvas.current, dataset.mem, '#ffd700', 'Memory %', 100);
    drawChart(fpsCanvas.current, dataset.fps, '#00ffff', 'FPS', 120);
    drawChart(netCanvas.current, dataset.net, '#ff00ff', 'Mbps', 100);
  };

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
  }, []);

  const scheduleDraw = useCallback(() => {
    const now = performance.now();
    if (now - lastDrawRef.current >= THROTTLE_MS) {
      lastDrawRef.current = now;
      animateCharts();
    }
  }, [animateCharts]);

  const togglePause = () => setPaused((p) => !p);
  const toggleStress = () => setStress((s) => !s);
  const openSettings = () => setSettingsOpen(true);

  const updateDraft = (metric, field, value) => {
    setDraft((prev) => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [field]: value,
      },
    }));
  };

  const clampPercent = (value, fallback) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(100, Math.max(0, parsed));
  };

  const clampWindow = (value, fallback) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(500, parsed);
  };

  const saveSettings = (event) => {
    event.preventDefault();
    const next = {
      cpu: {
        limit: clampPercent(draft.cpu.limit, thresholds.cpu.limit),
        debounceMs: clampWindow(draft.cpu.debounceMs, thresholds.cpu.debounceMs),
      },
      mem: {
        limit: clampPercent(draft.mem.limit, thresholds.mem.limit),
        debounceMs: clampWindow(draft.mem.debounceMs, thresholds.mem.debounceMs),
      },
    };
    setThresholds(next);
    setSettingsOpen(false);
  };

  const closeSettings = () => setSettingsOpen(false);
  const displayedLog = [...logEntries].slice().reverse();

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
        <button onClick={openSettings} className="px-2 py-1 bg-ub-dark-grey rounded">
          Settings
        </button>
        <div className="ml-auto text-right text-xs leading-tight text-gray-300">
          <div>
            CPU ≥ {thresholds.cpu.limit}% · window {Math.round(thresholds.cpu.debounceMs / 1000)}s
          </div>
          <div>
            Memory ≥ {thresholds.mem.limit}% · window {Math.round(thresholds.mem.debounceMs / 1000)}s
          </div>
        </div>
        <span className="text-sm">FPS: {fps.toFixed(1)}</span>
      </div>
      <div className="flex flex-1 overflow-hidden">
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
        <aside className="w-64 border-l border-gray-700 bg-ub-dark-grey/70 text-xs flex flex-col">
          <div className="flex items-center px-3 py-2 border-b border-gray-700">
            <h2 className="font-semibold">Alert Log</h2>
            <button
              onClick={clearLog}
              className="ml-auto text-[10px] uppercase tracking-wide text-gray-300 hover:text-white"
            >
              Clear
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto divide-y divide-gray-700">
            {displayedLog.length === 0 && (
              <li className="px-3 py-2 text-gray-400">No alerts yet</li>
            )}
            {displayedLog.map((entry) => (
              <li key={entry.id} className="px-3 py-2">
                <div className="text-[10px] text-gray-400">{formatTime(entry.timestamp)}</div>
                <div>{entry.message}</div>
              </li>
            ))}
          </ul>
        </aside>
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
      <Modal isOpen={settingsOpen} onClose={closeSettings}>
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/60"
          onClick={closeSettings}
        >
          <div
            role="document"
            className="w-full max-w-md rounded-lg border border-gray-700 bg-ub-cool-grey p-4 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-2">Alert Settings</h2>
            <form className="space-y-4" onSubmit={saveSettings}>
              {METRICS.map((metric) => (
                <fieldset key={metric} className="border border-gray-700 rounded p-3">
                  <legend className="px-1 text-xs uppercase tracking-wide text-gray-300">
                    {metricLabel[metric] || metric.toUpperCase()}
                  </legend>
                  <label className="flex flex-col gap-1 mb-2">
                    <span>Threshold (%)</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={draft[metric].limit}
                      onChange={(e) => updateDraft(metric, 'limit', e.target.value)}
                      className="rounded bg-ub-dark-grey p-1 text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>Debounce window (ms)</span>
                    <input
                      type="number"
                      min="500"
                      step="100"
                      value={draft[metric].debounceMs}
                      onChange={(e) => updateDraft(metric, 'debounceMs', e.target.value)}
                      className="rounded bg-ub-dark-grey p-1 text-white"
                    />
                  </label>
                </fieldset>
              ))}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeSettings}
                  className="px-3 py-1 rounded bg-ub-dark-grey"
                >
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1 rounded bg-green-600">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </Modal>
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
