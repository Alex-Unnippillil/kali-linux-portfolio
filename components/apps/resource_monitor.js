import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import ContextMenu from '../common/ContextMenu';
import { logEvent } from '../../utils/analytics';

// Number of samples to keep in the timeline
const MAX_POINTS = 60;
const THROTTLE_MIN = 750;
const THROTTLE_MAX = 2000;
const PROCESS_REFRESH_MS = 3000;
const NICE_MIN = -20;
const NICE_MAX = 19;
const SAMPLE_INTERVAL = 1000;

const METRICS = {
  cpu: {
    label: 'CPU Usage',
    color: '#53B3CB',
    max: 100,
    legend: 'Normalized CPU load sampled every second',
  },
  mem: {
    label: 'Memory Usage',
    color: '#F4A259',
    max: 100,
    legend: 'Heap usage from performance.memory when available',
  },
  fps: {
    label: 'Frame Rate',
    color: '#FF6B6B',
    max: 120,
    legend: 'Frames per second from requestAnimationFrame deltas',
  },
  net: {
    label: 'Network Throughput',
    color: '#9C89B8',
    max: 100,
    legend: 'Download Mbps from the simulated speed test worker',
  },
};

const PROCESS_BLUEPRINTS = [
  {
    name: 'chrome --type=renderer',
    command: 'chrome --type=renderer --profile-directory=Default',
    path: '/usr/bin/google-chrome',
    nice: 0,
  },
  {
    name: 'code',
    command: '/usr/share/code/code --unity-launch --inspect-port=0',
    path: '/usr/share/code',
    nice: 0,
  },
  {
    name: 'node',
    command: 'node server.js',
    path: '/home/kali/projects/portfolio',
    nice: -2,
  },
  {
    name: 'python3',
    command: 'python3 background_job.py',
    path: '/home/kali/scripts',
    nice: 5,
  },
  {
    name: 'postgres',
    command: '/usr/lib/postgresql/14/bin/postgres -D /var/lib/postgres',
    path: '/var/lib/postgresql/14/bin',
    nice: -4,
  },
  {
    name: 'docker-proxy',
    command: 'docker-proxy -proto tcp -host-ip 0.0.0.0 -host-port 3000',
    path: '/usr/libexec/docker',
    nice: 2,
  },
  {
    name: 'xorg',
    command: '/usr/lib/xorg/Xorg :0 vt1 -seat seat0 -auth /var/run/lightdm',
    path: '/usr/lib/xorg',
    nice: -10,
  },
  {
    name: 'gnome-shell',
    command: '/usr/bin/gnome-shell',
    path: '/usr/bin',
    nice: 0,
  },
  {
    name: 'pulseaudio',
    command: '/usr/bin/pulseaudio --daemonize=no',
    path: '/usr/bin',
    nice: 4,
  },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const randomBetween = (min, max) => Math.random() * (max - min) + min;

const createProcess = (blueprint, index) => {
  const baseCpu = randomBetween(2, 35);
  const baseMem = randomBetween(80, 850);
  return {
    pid: 3200 + index * 17,
    name: blueprint.name,
    command: blueprint.command,
    path: blueprint.path,
    nice: blueprint.nice,
    cpu: Number(baseCpu.toFixed(1)),
    mem: Math.round(baseMem),
    cpuBase: baseCpu,
    cpuVariance: randomBetween(2, 16),
    memBase: baseMem,
    memVariance: randomBetween(20, 140),
    status: 'running',
    launchOrder: index,
  };
};

const createInitialProcesses = () =>
  PROCESS_BLUEPRINTS.map((blueprint, index) => createProcess(blueprint, index));

export const createInitialProcessState = () => ({
  processes: createInitialProcesses(),
  sortKey: 'cpu',
  sortDirection: 'desc',
  lastAction: null,
  lastOpenedPath: null,
});

const updateProcessMetrics = (proc) => {
  if (proc.status !== 'running') {
    const cooledMemory = proc.mem > 0 ? Math.max(0, proc.mem * 0.6) : 0;
    return {
      ...proc,
      cpu: 0,
      mem: Math.round(cooledMemory),
    };
  }

  const nextCpuTarget = clamp(
    proc.cpuBase + randomBetween(-proc.cpuVariance, proc.cpuVariance),
    0,
    100,
  );
  const nextMemTarget = Math.max(
    0,
    proc.memBase + randomBetween(-proc.memVariance, proc.memVariance),
  );

  return {
    ...proc,
    cpu: Number((proc.cpu * 0.55 + nextCpuTarget * 0.45).toFixed(1)),
    mem: Math.max(0, Math.round(proc.mem * 0.6 + nextMemTarget * 0.4)),
  };
};

export const processReducer = (state, action) => {
  switch (action.type) {
    case 'refresh':
      return {
        ...state,
        processes: state.processes.map(updateProcessMetrics),
      };
    case 'sort': {
      const { key } = action.payload || {};
      if (!key) return state;
      const nextDirection =
        state.sortKey === key
          ? state.sortDirection === 'desc'
            ? 'asc'
            : 'desc'
          : key === 'name'
            ? 'asc'
            : 'desc';
      return {
        ...state,
        sortKey: key,
        sortDirection: nextDirection,
      };
    }
    case 'kill': {
      const { pid } = action.payload || {};
      if (!pid) return state;
      let updated = false;
      const processes = state.processes.map((proc) => {
        if (proc.pid !== pid) return proc;
        updated = true;
        return {
          ...proc,
          status: 'terminated',
          cpu: 0,
          cpuBase: 0,
          mem: 0,
          memBase: 0,
        };
      });
      if (!updated) return state;
      return {
        ...state,
        processes,
        lastAction: { type: 'kill', pid },
      };
    }
    case 'renice': {
      const { pid, nice } = action.payload || {};
      if (!pid || typeof nice !== 'number') return state;
      let updatedProcess = null;
      const processes = state.processes.map((proc) => {
        if (proc.pid !== pid) return proc;
        const nextNice = clamp(Math.round(nice), NICE_MIN, NICE_MAX);
        updatedProcess = { ...proc, nice: nextNice };
        return updatedProcess;
      });
      if (!updatedProcess) return state;
      return {
        ...state,
        processes,
        lastAction: { type: 'renice', pid, nice: updatedProcess.nice },
      };
    }
    case 'open-location': {
      const { pid } = action.payload || {};
      if (!pid) return state;
      const proc = state.processes.find((p) => p.pid === pid);
      if (!proc) return state;
      return {
        ...state,
        lastAction: { type: 'open-location', pid, path: proc.path },
        lastOpenedPath: proc.path,
      };
    }
    case 'acknowledge':
      if (!state.lastAction) return state;
      return {
        ...state,
        lastAction: null,
      };
    default:
      return state;
  }
};

export const sortProcessList = (processes, sortKey, sortDirection) => {
  const direction = sortDirection === 'asc' ? 1 : -1;
  return [...processes].sort((a, b) => {
    let result = 0;
    if (sortKey === 'name') {
      result = a.name.localeCompare(b.name);
    } else if (sortKey === 'pid') {
      result = a.pid - b.pid;
    } else if (sortKey === 'cpu') {
      result = a.cpu - b.cpu;
    } else if (sortKey === 'mem') {
      result = a.mem - b.mem;
    } else if (sortKey === 'nice') {
      result = a.nice - b.nice;
    }
    if (result === 0) {
      return a.launchOrder - b.launchOrder;
    }
    return result * direction;
  });
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
  const drawStatsRef = useRef({ throttle: 1000, avgDuration: 0 });
  const workerStatsRef = useRef({ avgDuration: 0 });
  const updateIntervalRef = useRef(drawStatsRef.current.throttle);

  const [processState, dispatch] = useReducer(
    processReducer,
    undefined,
    createInitialProcessState,
  );
  const [paused, setPaused] = useState(false);
  const [stress, setStress] = useState(false);
  const [fps, setFps] = useState(0);
  const [actionMessage, setActionMessage] = useState('');
  const [updateInterval, setUpdateInterval] = useState(updateIntervalRef.current);

  const stressWindows = useRef([]);
  const stressEls = useRef([]);
  const containerRef = useRef(null);
  const toastTimerRef = useRef(null);
  const rowRefs = useRef(new Map());

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  const showToast = useCallback((text) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setActionMessage(text);
    toastTimerRef.current = setTimeout(() => setActionMessage(''), 4000);
  }, []);

  const getRowRef = useCallback((pid) => {
    if (!rowRefs.current.has(pid)) {
      rowRefs.current.set(pid, React.createRef());
    }
    return rowRefs.current.get(pid);
  }, []);

  const updateThrottle = useCallback(
    (nextThrottle) => {
      const clamped = clamp(nextThrottle, THROTTLE_MIN, THROTTLE_MAX);
      const stats = drawStatsRef.current;
      if (Math.abs(clamped - stats.throttle) < 1) return;
      stats.throttle = clamped;
      const rounded = Math.round(clamped);
      if (rounded !== updateIntervalRef.current) {
        updateIntervalRef.current = rounded;
        setUpdateInterval(rounded);
      }
    },
    [setUpdateInterval],
  );

  const updateDrawBudget = useCallback(
    (duration) => {
      const stats = drawStatsRef.current;
      stats.avgDuration = stats.avgDuration * 0.9 + duration * 0.1;
      const ratio = stats.avgDuration / stats.throttle || 0;
      if (ratio > 0.05) {
        updateThrottle(stats.throttle * 1.2 + 24);
      } else if (ratio < 0.02) {
        updateThrottle(stats.throttle * 0.9);
      }
    },
    [updateThrottle],
  );

  const pushSample = useCallback((key, value) => {
    const arr = dataRef.current[key];
    arr.push(value);
    if (arr.length > MAX_POINTS) arr.shift();
  }, []);

  const drawCharts = useCallback(
    (dataset = dataRef.current) => {
      const started = performance.now();
      drawChart(cpuCanvas.current, dataset.cpu, METRICS.cpu);
      drawChart(memCanvas.current, dataset.mem, METRICS.mem);
      drawChart(fpsCanvas.current, dataset.fps, METRICS.fps);
      drawChart(netCanvas.current, dataset.net, METRICS.net);
      updateDrawBudget(performance.now() - started);
    },
    [updateDrawBudget],
  );

  const animateCharts = useCallback(() => {
    const from = Object.fromEntries(
      Object.entries(displayRef.current).map(([key, values]) => [
        key,
        values.slice(),
      ]),
    );
    const to = Object.fromEntries(
      Object.entries(dataRef.current).map(([key, values]) => [key, values.slice()]),
    );
    const start = performance.now();
    const duration = 300;

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const interpolated = {};
      Object.keys(METRICS).forEach((key) => {
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
    if (paused) return;
    const now = performance.now();
    const throttle = drawStatsRef.current.throttle;
    if (now - lastDrawRef.current >= throttle) {
      lastDrawRef.current = now;
      animateCharts();
    }
  }, [animateCharts, paused]);

  useEffect(() => {
    if (!paused) {
      dispatch({ type: 'refresh' });
      scheduleDraw();
    }
  }, [paused, scheduleDraw]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker !== 'function') return;
    workerRef.current = new Worker(
      new URL('./speedtest.worker.js', import.meta.url),
    );
    workerRef.current.onmessage = (e) => {
      const begin = performance.now();
      const { speed } = e.data || {};
      pushSample('net', speed);
      const duration = performance.now() - begin;
      const stats = workerStatsRef.current;
      stats.avgDuration = stats.avgDuration * 0.8 + duration * 0.2;
      if (stats.avgDuration > 4) {
        updateThrottle(drawStatsRef.current.throttle + stats.avgDuration * 10);
      }
      if (!paused) {
        scheduleDraw();
      }
    };
    workerRef.current.postMessage({ type: 'start' });
    return () => workerRef.current?.terminate();
  }, [paused, pushSample, scheduleDraw, updateThrottle]);

  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: paused ? 'stop' : 'start' });
    }
  }, [paused]);

  useEffect(() => {
    let raf;
    let lastFrame = performance.now();
    let lastSample = performance.now();

    const sample = (now) => {
      const dt = now - lastFrame;
      lastFrame = now;
      const currentFps = 1000 / dt;
      if (!paused) setFps(currentFps);

      if (!paused && now - lastSample >= SAMPLE_INTERVAL) {
        const target = 1000 / 60;
        const cpu = clamp(((dt - target) / target) * 100, 0, 100);
        let mem = dataRef.current.mem[dataRef.current.mem.length - 1] || 0;
        if (performance && performance.memory) {
          const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
          mem = totalJSHeapSize
            ? (usedJSHeapSize / totalJSHeapSize) * 100
            : mem;
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
  }, [paused, pushSample, scheduleDraw]);

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

  useEffect(() => {
    if (paused) return undefined;
    const id = setInterval(() => dispatch({ type: 'refresh' }), PROCESS_REFRESH_MS);
    return () => clearInterval(id);
  }, [paused]);

  useEffect(() => {
    const action = processState.lastAction;
    if (!action) return;
    if (action.type === 'kill') {
      showToast(`Sent SIGTERM to PID ${action.pid}.`);
    } else if (action.type === 'renice') {
      showToast(`Adjusted nice for PID ${action.pid} to ${action.nice}.`);
    } else if (action.type === 'open-location') {
      showToast(`Opening ${action.path}`);
    }
    dispatch({ type: 'acknowledge' });
  }, [processState.lastAction, dispatch, showToast]);

  const sortedProcesses = useMemo(
    () =>
      sortProcessList(
        processState.processes,
        processState.sortKey,
        processState.sortDirection,
      ),
    [processState.processes, processState.sortDirection, processState.sortKey],
  );

  const handleKill = useCallback(
    (proc) => {
      if (proc.status === 'terminated') {
        showToast(`Process ${proc.pid} is already terminated.`);
        return;
      }
      dispatch({ type: 'kill', payload: { pid: proc.pid } });
      logEvent({
        category: 'resource-monitor',
        action: 'kill-process',
        label: `${proc.name}:${proc.pid}`,
      });
    },
    [dispatch, showToast],
  );

  const performRenice = useCallback(
    (proc, value) => {
      dispatch({ type: 'renice', payload: { pid: proc.pid, nice: value } });
      logEvent({
        category: 'resource-monitor',
        action: 'renice-process',
        label: `${proc.name}:${proc.pid}`,
      });
    },
    [dispatch],
  );

  const handleRenice = useCallback(
    (proc) => {
      if (typeof window === 'undefined') return;
      const response = window.prompt(
        'Set new nice value (-20 to 19)',
        String(proc.nice),
      );
      if (response === null) return;
      const parsed = Number.parseInt(response, 10);
      if (Number.isNaN(parsed)) {
        showToast('Nice value must be a number between -20 and 19.');
        return;
      }
      performRenice(proc, parsed);
    },
    [performRenice, showToast],
  );

  const handleOpenLocation = useCallback(
    (proc) => {
      dispatch({ type: 'open-location', payload: { pid: proc.pid } });
      logEvent({
        category: 'resource-monitor',
        action: 'open-file-location',
        label: proc.path,
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('resource-monitor:open-path', { detail: proc.path }),
        );
      }
    },
    [dispatch],
  );

  const handleSort = useCallback(
    (key) => {
      dispatch({ type: 'sort', payload: { key } });
      logEvent({
        category: 'resource-monitor',
        action: 'sort-process',
        label: key,
      });
    },
    [dispatch],
  );

  const menuItems = useMemo(
    () =>
      sortedProcesses.map((proc) => ({
        pid: proc.pid,
        items: [
          { label: 'Kill Process', onSelect: () => handleKill(proc) },
          { label: 'Renice…', onSelect: () => handleRenice(proc) },
          {
            label: 'Open File Location',
            onSelect: () => handleOpenLocation(proc),
          },
        ],
      })),
    [sortedProcesses, handleKill, handleRenice, handleOpenLocation],
  );

  const sortIndicator = (key) =>
    processState.sortKey === key
      ? processState.sortDirection === 'asc'
        ? '▲'
        : '▼'
      : null;

  const headerButtonClass =
    'flex items-center gap-1 w-full text-left focus:outline-none focus:ring-1 focus:ring-ubt-ginger px-2 py-1 rounded';

  const togglePause = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      logEvent({
        category: 'resource-monitor',
        action: next ? 'pause' : 'resume',
      });
      return next;
    });
  }, []);

  const toggleStress = useCallback(() => {
    setStress((prev) => {
      const next = !prev;
      logEvent({
        category: 'resource-monitor',
        action: next ? 'start-stress' : 'stop-stress',
      });
      return next;
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full flex flex-col bg-ub-cool-grey text-white font-ubuntu overflow-hidden"
    >
      <div className="p-3 flex flex-wrap gap-2 items-center border-b border-black/40 bg-black/30">
        <button
          onClick={togglePause}
          className="px-3 py-1.5 bg-ub-dark-grey rounded text-sm hover:bg-ubt-ginger transition-colors"
        >
          {paused ? 'Resume sampling' : 'Pause sampling'}
        </button>
        <button
          onClick={toggleStress}
          className="px-3 py-1.5 bg-ub-dark-grey rounded text-sm hover:bg-ubt-ginger transition-colors"
        >
          {stress ? 'Stop stress test' : 'Start stress test'}
        </button>
        <span className="ml-auto text-sm text-gray-200">FPS: {fps.toFixed(1)}</span>
        <span className="text-xs text-gray-400">
          Update interval ≈ {updateInterval} ms
        </span>
      </div>
      {actionMessage ? (
        <div className="px-4 py-2 text-xs text-gray-100 bg-black/40 border-b border-black/50">
          {actionMessage}
        </div>
      ) : null}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-y-auto">
        {[
          { key: 'cpu', canvas: cpuCanvas },
          { key: 'mem', canvas: memCanvas },
          { key: 'fps', canvas: fpsCanvas },
          { key: 'net', canvas: netCanvas },
        ].map(({ key, canvas }) => {
          const metric = METRICS[key];
          const latest = dataRef.current[key][dataRef.current[key].length - 1];
          return (
            <div
              key={key}
              className="bg-black/30 border border-black/40 rounded-lg p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-100">
                  <span
                    className="inline-block w-3 h-3 rounded"
                    style={{ backgroundColor: metric.color }}
                    aria-hidden="true"
                  />
                  {metric.label}
                </div>
                <span className="text-xs text-gray-300">
                  {typeof latest === 'number' ? latest.toFixed(1) : '0.0'}
                </span>
              </div>
              <p className="text-xs text-gray-400">{metric.legend}</p>
              <canvas
                ref={canvas}
                width={320}
                height={140}
                role="img"
                aria-label={`${metric.label} trend`}
                className="bg-ub-dark-grey rounded"
              />
            </div>
          );
        })}
      </div>
      <div className="px-4 pb-4 flex-1 overflow-y-auto">
        <div className="bg-black/30 border border-black/50 rounded-lg overflow-hidden relative">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/40 bg-black/40">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
              Processes
            </h2>
            <span className="text-xs text-gray-400">
              Right-click a row or use the actions menu
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-black/30 text-gray-200">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-2 w-1/3"
                    aria-sort={processState.sortKey === 'name' ? processState.sortDirection : 'none'}
                  >
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => handleSort('name')}
                    >
                      Process
                      {sortIndicator('name') ? (
                        <span aria-hidden="true">{sortIndicator('name')}</span>
                      ) : null}
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2"
                    aria-sort={processState.sortKey === 'pid' ? processState.sortDirection : 'none'}
                  >
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => handleSort('pid')}
                    >
                      PID
                      {sortIndicator('pid') ? (
                        <span aria-hidden="true">{sortIndicator('pid')}</span>
                      ) : null}
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2"
                    aria-sort={processState.sortKey === 'cpu' ? processState.sortDirection : 'none'}
                  >
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => handleSort('cpu')}
                    >
                      CPU %
                      {sortIndicator('cpu') ? (
                        <span aria-hidden="true">{sortIndicator('cpu')}</span>
                      ) : null}
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2"
                    aria-sort={processState.sortKey === 'mem' ? processState.sortDirection : 'none'}
                  >
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => handleSort('mem')}
                    >
                      Memory (MB)
                      {sortIndicator('mem') ? (
                        <span aria-hidden="true">{sortIndicator('mem')}</span>
                      ) : null}
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2"
                    aria-sort={processState.sortKey === 'nice' ? processState.sortDirection : 'none'}
                  >
                    <button
                      type="button"
                      className={headerButtonClass}
                      onClick={() => handleSort('nice')}
                    >
                      Nice
                      {sortIndicator('nice') ? (
                        <span aria-hidden="true">{sortIndicator('nice')}</span>
                      ) : null}
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-2 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedProcesses.map((proc) => {
                  const ref = getRowRef(proc.pid);
                  return (
                    <tr
                      key={proc.pid}
                      ref={ref}
                      className="border-b border-black/30 last:border-b-0 hover:bg-white/10 transition-colors"
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-100 truncate">
                            {proc.name}
                          </span>
                          {proc.status !== 'running' ? (
                            <span className="text-[10px] uppercase tracking-wide bg-red-600/30 border border-red-500/60 text-red-200 rounded px-2 py-0.5">
                              Terminated
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-gray-400 truncate max-w-xs">{proc.command}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-200">{proc.pid}</td>
                      <td className="px-4 py-3 text-gray-200">{proc.cpu.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-gray-200">
                        {proc.mem.toLocaleString()} MB
                      </td>
                      <td className="px-4 py-3 text-gray-200">{proc.nice}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleKill(proc)}
                            className="px-2 py-1 rounded bg-red-700/50 border border-red-500/60 hover:bg-red-600/60 transition-colors"
                          >
                            Kill
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRenice(proc)}
                            className="px-2 py-1 rounded bg-blue-700/40 border border-blue-500/60 hover:bg-blue-600/60 transition-colors"
                          >
                            Renice
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenLocation(proc)}
                            className="px-2 py-1 rounded bg-gray-700/50 border border-gray-500/60 hover:bg-gray-600/60 transition-colors"
                          >
                            Open
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {menuItems.map(({ pid, items }) => {
        const ref = getRowRef(pid);
        return (
          <ContextMenu key={`menu-${pid}`} targetRef={ref} items={items} />
        );
      })}
      {stressWindows.current.map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            stressEls.current[i] = el;
          }}
          className="absolute w-8 h-6 bg-white/20 border border-gray-500 pointer-events-none"
        />
      ))}
    </div>
  );
};

function drawChart(canvas, values, metric) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (let i = 1; i < 4; i += 1) {
    const y = (i / 4) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.strokeStyle = metric.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = (i / (values.length - 1 || 1)) * w;
    const y = h - (v / metric.max) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const latest = values[values.length - 1] || 0;
  const latestX = ((values.length - 1) / Math.max(values.length - 1, 1)) * w;
  const latestY = h - (latest / metric.max) * h;
  ctx.fillStyle = metric.color;
  ctx.beginPath();
  ctx.arc(latestX, latestY, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = "12px 'Ubuntu', sans-serif";
  ctx.fillText(`${metric.label}: ${latest.toFixed(1)}`, 8, 16);
}

export default ResourceMonitor;

export const displayResourceMonitor = (addFolder, openApp) => (
  <ResourceMonitor addFolder={addFolder} openApp={openApp} />
);
