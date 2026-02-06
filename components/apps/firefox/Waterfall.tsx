import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';

type PhaseKey = 'dns' | 'connect' | 'ttfb' | 'transfer';

type RequestPhase = {
  key: PhaseKey;
  duration: number;
};

type WaterfallRequest = {
  id: string;
  label: string;
  start: number;
  phases: RequestPhase[];
  total: number;
};

type WaterfallDetailLevel = 'overview' | 'standard' | 'deep-dive';

type WaterfallProps = {
  defaultDetail?: WaterfallDetailLevel;
};

type ViewState = {
  offset: number;
  pxPerMs: number;
};

type LayoutSegment = {
  x: number;
  width: number;
  key: PhaseKey;
};

type LayoutRow = {
  id: string;
  y: number;
  height: number;
  segments: LayoutSegment[];
  label: string;
};

const ROW_HEIGHT = 34;
const TOP_PADDING = 28;
const RIGHT_PADDING = 16;
const LEFT_PADDING = 48;
const CANVAS_MIN_HEIGHT = 240;
const DETAIL_PRESETS: Record<WaterfallDetailLevel, { count: number; jitter: number; baseGap: number }> = {
  overview: { count: 6, jitter: 0.25, baseGap: 42 },
  standard: { count: 11, jitter: 0.35, baseGap: 34 },
  'deep-dive': { count: 18, jitter: 0.45, baseGap: 28 },
};

const PHASE_META: Record<PhaseKey, { label: string; color: string; description: string }> = {
  dns: {
    label: 'DNS lookup',
    color: '#60a5fa',
    description: 'Resolver time to translate hostnames to IP addresses.',
  },
  connect: {
    label: 'TCP connect',
    color: '#34d399',
    description: 'Socket setup and TLS negotiation latency.',
  },
  ttfb: {
    label: 'Waiting (TTFB)',
    color: '#fbbf24',
    description: 'Server processing until the first byte is returned.',
  },
  transfer: {
    label: 'Content download',
    color: '#f87171',
    description: 'Streaming the response body to the browser.',
  },
};

const RESOURCE_NAMES = [
  'GET /',
  'GET /css/app.css',
  'GET /js/vendor.js',
  'GET /img/logo.svg',
  'GET /img/banner.jpg',
  'GET /fonts/inter.woff2',
  'GET /api/profile',
  'GET /api/dashboard',
  'GET /api/messages',
  'GET /tracking.js',
  'GET /metrics',
  'GET /img/avatar.png',
  'GET /img/background.webp',
  'GET /video/intro.mp4',
  'GET /wasm/module.wasm',
  'GET /docs/manual.pdf',
  'GET /stream/live',
  'GET /img/diagram.png',
  'GET /css/print.css',
  'GET /js/chart.js',
  'GET /img/icon-512.png',
  'GET /img/icon-192.png',
  'GET /api/notifications',
];

const formatDuration = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} s`;
  }
  return `${Math.round(value)} ms`;
};

const createRng = (seed: number) => {
  let current = seed;
  return () => {
    current += 0.5;
    const x = Math.sin(current) * 10000;
    return x - Math.floor(x);
  };
};

const generateRequests = (detail: WaterfallDetailLevel, seed = 12): WaterfallRequest[] => {
  const preset = DETAIL_PRESETS[detail];
  const rng = createRng(seed + preset.count);
  let currentStart = 0;
  const requests: WaterfallRequest[] = [];

  for (let index = 0; index < preset.count; index += 1) {
    const name = RESOURCE_NAMES[index % RESOURCE_NAMES.length] ?? `GET /resource-${index}`;
    const burst = index > 0 && index % 4 === 0;
    const spacingMultiplier = burst ? 0.32 : 1;
    const gap = preset.baseGap * spacingMultiplier * (0.4 + rng() * (1 + preset.jitter));
    currentStart += gap;

    const dns = 12 + rng() * 28 * (1 + preset.jitter * 0.6);
    const connect = 30 + rng() * 50 * (1 + preset.jitter * 0.8);
    const ttfb = 90 + rng() * 160 * (1 + preset.jitter);
    const transfer = 40 + rng() * 240 * (burst ? 1.6 : 1 + preset.jitter);

    const phases: RequestPhase[] = [
      { key: 'dns', duration: dns },
      { key: 'connect', duration: connect },
      { key: 'ttfb', duration: ttfb },
      { key: 'transfer', duration: transfer },
    ];

    const total = phases.reduce((acc, phase) => acc + phase.duration, 0);

    requests.push({
      id: `req-${index}`,
      label: name,
      start: currentStart,
      phases,
      total,
    });
  }

  return requests;
};

type Tick = {
  position: number;
  label: string;
  value: number;
};

const niceStep = (roughStep: number) => {
  const exponent = Math.floor(Math.log10(roughStep));
  const magnitude = Math.pow(10, exponent);
  const fraction = roughStep / magnitude;
  if (fraction < 1.5) {
    return 1 * magnitude;
  }
  if (fraction < 3) {
    return 2 * magnitude;
  }
  if (fraction < 7) {
    return 5 * magnitude;
  }
  return 10 * magnitude;
};

const computeTicks = (view: ViewState, width: number, maxTime: number): Tick[] => {
  if (width <= 0 || view.pxPerMs <= 0) {
    return [];
  }
  const visibleMs = width / view.pxPerMs;
  const step = niceStep(visibleMs / 6);
  const ticks: Tick[] = [];
  const start = Math.max(0, Math.floor(view.offset / step) * step);
  const end = Math.min(maxTime, view.offset + visibleMs + step);

  for (let value = start; value <= end; value += step) {
    const x = (value - view.offset) * view.pxPerMs + LEFT_PADDING;
    ticks.push({ position: x, value, label: formatDuration(value) });
  }

  return ticks;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const Waterfall: React.FC<WaterfallProps> = ({ defaultDetail = 'standard' }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [detail, setDetail] = useState<WaterfallDetailLevel>(defaultDetail);
  const requests = useMemo(() => generateRequests(detail), [detail]);
  const maxTime = useMemo(() => {
    if (requests.length === 0) return 0;
    return requests.reduce((acc, request) => Math.max(acc, request.start + request.total), 0);
  }, [requests]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoverRef = useRef<{ request: WaterfallRequest; clientX: number; clientY: number } | null>(null);
  const viewRef = useRef<ViewState>({ offset: 0, pxPerMs: 1 });
  const [size, setSize] = useState({ width: 0, height: CANVAS_MIN_HEIGHT });
  const layoutRef = useRef<LayoutRow[]>([]);
  const animationRef = useRef<number | null>(null);
  const pendingFrameRef = useRef(false);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [hover, setHover] = useState<{ request: WaterfallRequest; x: number; y: number } | null>(null);
  const [viewSnapshot, setViewSnapshot] = useState({ offset: 0, pxPerMs: 0 });
  const drawWaterfallRef = useRef<(() => void) | null>(null);

  const defaultPxPerMs = useMemo(() => {
    if (size.width === 0 || maxTime === 0) {
      return 0.5;
    }
    return (size.width - LEFT_PADDING - RIGHT_PADDING) / maxTime;
  }, [size.width, maxTime]);

  const requestRender = useCallback(
    (immediate = false) => {
      if (immediate || prefersReducedMotion) {
        pendingFrameRef.current = false;
        const draw = drawWaterfallRef.current;
        draw?.();
        return;
      }
      if (pendingFrameRef.current) return;
      pendingFrameRef.current = true;
      animationRef.current = requestAnimationFrame(() => {
        pendingFrameRef.current = false;
        const draw = drawWaterfallRef.current;
        draw?.();
      });
    },
    [prefersReducedMotion]
  );

  const cancelAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    pendingFrameRef.current = false;
  }, []);

  const updateView = useCallback(
    (next: Partial<ViewState>) => {
      const view = viewRef.current;
      const width = size.width - LEFT_PADDING - RIGHT_PADDING;
      if (width <= 0) return;
      const minPx = defaultPxPerMs * 0.25 || 0.02;
      const maxPx = defaultPxPerMs * 12 || 4;

      if (typeof next.pxPerMs === 'number') {
        view.pxPerMs = clamp(next.pxPerMs, minPx, maxPx);
      }
      const visibleMs = width / view.pxPerMs;
      const maxOffset = Math.max(0, maxTime - visibleMs);
      if (typeof next.offset === 'number') {
        view.offset = clamp(next.offset, 0, maxOffset);
      } else {
        view.offset = clamp(view.offset, 0, maxOffset);
      }
      setViewSnapshot((prev) => {
        const offsetChanged = Math.abs(prev.offset - view.offset) > 0.1;
        const zoomChanged = Math.abs(prev.pxPerMs - view.pxPerMs) > 0.001;
        if (offsetChanged || zoomChanged || (prev.offset === 0 && prev.pxPerMs === 0)) {
          return { offset: view.offset, pxPerMs: view.pxPerMs };
        }
        return prev;
      });
      requestRender();
    },
    [defaultPxPerMs, maxTime, requestRender, size.width]
  );

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        layoutRef.current = [];
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        layoutRef.current = [];
        return;
      }
      const width = size.width || canvas.clientWidth;
      const usableWidth = width - LEFT_PADDING - RIGHT_PADDING;
      const rows = requests.length;
      const height = Math.max(CANVAS_MIN_HEIGHT, TOP_PADDING + rows * ROW_HEIGHT);
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(LEFT_PADDING, TOP_PADDING - 6);
      ctx.lineTo(width - RIGHT_PADDING, TOP_PADDING - 6);
      ctx.stroke();

      const view = viewRef.current;
      const layout: LayoutRow[] = [];

      requests.forEach((request, index) => {
        const y = TOP_PADDING + index * ROW_HEIGHT + 4;
        const heightPx = ROW_HEIGHT - 12;
        const baseX = LEFT_PADDING + (request.start - view.offset) * view.pxPerMs;
        const segments: LayoutSegment[] = [];

        let cursor = baseX;
        request.phases.forEach((phase) => {
          const widthPx = phase.duration * view.pxPerMs;
          if (cursor + widthPx < LEFT_PADDING || cursor > LEFT_PADDING + usableWidth) {
            cursor += widthPx;
            return;
          }
          ctx.fillStyle = PHASE_META[phase.key].color;
          const drawWidth = Math.max(1, widthPx);
          ctx.fillRect(cursor, y, drawWidth, heightPx);
          segments.push({ x: cursor, width: drawWidth, key: phase.key });
          cursor += widthPx;
        });

        ctx.fillStyle = '#cbd5f5';
        ctx.font = '12px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(request.label, 8, y + heightPx / 2);

        layout.push({ id: request.id, y, height: heightPx, segments, label: request.label });
      });

      layoutRef.current = layout;

      setViewSnapshot((prev) => {
        if (prev.pxPerMs === 0 && prev.offset === 0) {
          return { offset: view.offset, pxPerMs: view.pxPerMs };
        }
        return prev;
      });

      const nextTicks = computeTicks(view, width - RIGHT_PADDING, maxTime);
      setTicks((prev) => {
        if (prev.length === nextTicks.length) {
          const same = prev.every((tick, idx) => Math.abs(tick.value - nextTicks[idx].value) < 0.5);
          if (same) {
            return prev;
          }
        }
        return nextTicks;
      });

      ctx.restore();
    };

    drawWaterfallRef.current = draw;
    requestRender(true);

    return () => {
      drawWaterfallRef.current = null;
    };
  }, [maxTime, requestRender, requests, size.width]);

  useEffect(() => () => cancelAnimation(), [cancelAnimation]);

  useEffect(() => {
    const view = viewRef.current;
    view.offset = 0;
    view.pxPerMs = defaultPxPerMs;
    requestRender(true);
  }, [defaultPxPerMs, requestRender, detail]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof window === 'undefined') {
      return undefined;
    }

    const updateSize = (width: number) => {
      setSize((prev) => {
        if (prev.width === width) {
          return prev;
        }
        return { width, height: prev.height };
      });
    };

    updateSize(node.clientWidth || node.offsetWidth || 0);

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const contentWidth = entry.contentRect?.width ?? node.clientWidth;
          updateSize(contentWidth);
        }
      });
      observer.observe(node);
      return () => observer.disconnect();
    }

    const handleResize = () => {
      updateSize(node.clientWidth || node.offsetWidth || 0);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const phaseTotals = useMemo(() => {
    const totals: Record<PhaseKey, number> = { dns: 0, connect: 0, ttfb: 0, transfer: 0 };
    requests.forEach((request) => {
      request.phases.forEach((phase) => {
        totals[phase.key] += phase.duration;
      });
    });
    return totals;
  }, [requests]);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (maxTime === 0) return;
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const focusX = event.clientX - rect.left - LEFT_PADDING;
      const width = rect.width - LEFT_PADDING - RIGHT_PADDING;
      if (width <= 0) return;
      const view = viewRef.current;

      if (event.ctrlKey || event.metaKey) {
        const zoomDirection = event.deltaY > 0 ? 1 : -1;
        const zoomFactor = Math.exp(zoomDirection * 0.15);
        const newPxPerMs = view.pxPerMs * zoomFactor;
        const focusRatio = clamp(focusX / width, 0, 1);
        const visibleMsBefore = width / view.pxPerMs;
        const focusTime = view.offset + visibleMsBefore * focusRatio;
        updateView({ pxPerMs: newPxPerMs });
        const visibleMsAfter = width / viewRef.current.pxPerMs;
        const newOffset = focusTime - visibleMsAfter * focusRatio;
        updateView({ offset: newOffset });
        return;
      }

      const deltaMs = event.deltaY / view.pxPerMs;
      updateView({ offset: view.offset + deltaMs });
    },
    [maxTime, updateView]
  );

  const draggingRef = useRef(false);
  const lastXRef = useRef(0);

  const updateHover = useCallback(
    (clientX: number, clientY: number) => {
      const rows = layoutRef.current;
      if (!rows.length) {
        if (hoverRef.current) {
          hoverRef.current = null;
          setHover(null);
        }
        return;
      }
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;

      const row = rows.find((entry) => localY >= entry.y && localY <= entry.y + entry.height);
      if (!row) {
        if (hoverRef.current) {
          hoverRef.current = null;
          setHover(null);
        }
        return;
      }
      const request = requests.find((item) => item.id === row.id);
      if (!request) return;
      hoverRef.current = { request, clientX, clientY };
      setHover({ request, x: localX, y: localY });
    },
    [requests]
  );

  const surfaceHandlers = {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = true;
      lastXRef.current = event.clientX;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      if (draggingRef.current) {
        const view = viewRef.current;
        const delta = lastXRef.current - event.clientX;
        lastXRef.current = event.clientX;
        const deltaMs = delta / view.pxPerMs;
        updateView({ offset: view.offset + deltaMs });
      } else {
        updateHover(event.clientX, event.clientY);
      }
    },
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = false;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      updateHover(event.clientX, event.clientY);
    },
    onPointerLeave: () => {
      draggingRef.current = false;
      hoverRef.current = null;
      setHover(null);
    },
  };

  const detailLabel: Record<WaterfallDetailLevel, string> = {
    overview: 'Quick overview',
    standard: 'Classroom baseline',
    'deep-dive': 'Deep dive lab',
  };

  return (
    <section
      ref={containerRef}
      className="flex flex-col gap-4 rounded-lg border border-gray-800 bg-gray-900/80 p-4"
      aria-label="Network timing waterfall"
    >
      <header className="flex flex-col gap-2 text-sm text-gray-300 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-100">Network waterfall explorer</h2>
          <p className="text-xs text-gray-400">
            Visualise DNS, TCP connect, and TTFB phases to explain how browser requests flow. Drag to pan, hold Ctrl and scroll to
            zoom.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-200">
          Detail level
          <select
            value={detail}
            onChange={(event) => setDetail(event.target.value as WaterfallDetailLevel)}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {Object.entries(detailLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div
        className="relative overflow-hidden rounded border border-gray-800 bg-black"
        data-testid="waterfall-surface"
        role="presentation"
        onWheel={handleWheel}
        {...surfaceHandlers}
        data-view-offset={viewSnapshot.offset.toFixed(2)}
        data-zoom={viewSnapshot.pxPerMs.toFixed(4)}
      >
        <canvas ref={canvasRef} aria-hidden="true" />
        <svg className="pointer-events-none absolute inset-0" role="presentation" aria-hidden="true">
          {ticks.map((tick) => (
            <g key={tick.value} transform={`translate(${tick.position},0)`}>
              <line x1={0} y1={TOP_PADDING - 6} x2={0} y2="100%" stroke="#1f2937" strokeWidth={1} />
              <text
                data-testid="waterfall-tick"
                x={0}
                y={12}
                textAnchor="middle"
                fontSize={10}
                fill="#94a3b8"
              >
                {tick.label}
              </text>
            </g>
          ))}
        </svg>
        {hover ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 max-w-xs rounded bg-gray-900/95 px-3 py-2 text-xs text-gray-100 shadow-lg"
            style={{
              left: hover.x + 16,
              top: hover.y + 12,
            }}
          >
            <p className="font-semibold text-blue-200">{hover.request.label}</p>
            <ul className="mt-1 space-y-1">
              {hover.request.phases.map((phase) => (
                <li key={phase.key} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded"
                    style={{ backgroundColor: PHASE_META[phase.key].color }}
                  />
                  <span className="text-gray-300">{PHASE_META[phase.key].label}</span>
                  <span className="ml-auto text-gray-200">{formatDuration(phase.duration)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] uppercase tracking-wide text-gray-400">
              Total {formatDuration(hover.request.total)}
            </p>
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(PHASE_META).map(([key, info]) => (
          <div key={key} className="rounded border border-gray-800 bg-gray-950/70 p-3 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded" style={{ backgroundColor: info.color }} />
              <p className="font-semibold text-gray-100">{info.label}</p>
            </div>
            <p className="mt-1 text-[11px] text-gray-400">{info.description}</p>
            <p className="mt-2 text-xs font-medium text-gray-200">
              Cumulative {formatDuration(phaseTotals[key as PhaseKey])}
            </p>
          </div>
        ))}
      </div>
      <table className="sr-only" aria-label="Request timing breakdown">
        <thead>
          <tr>
            <th scope="col">Request</th>
            <th scope="col">Start time</th>
            <th scope="col">DNS</th>
            <th scope="col">Connect</th>
            <th scope="col">TTFB</th>
            <th scope="col">Transfer</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id}>
              <th scope="row">{request.label}</th>
              <td>{formatDuration(request.start)}</td>
              {request.phases.map((phase) => (
                <td key={phase.key}>{formatDuration(phase.duration)}</td>
              ))}
              <td>{formatDuration(request.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default Waterfall;
