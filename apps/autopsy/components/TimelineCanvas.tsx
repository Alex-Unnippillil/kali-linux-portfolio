'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { TimelineCategory, TimelineEvent } from '../types';
import {
  createInitialTimelineState,
  timelineReducer,
} from './timelineState';

interface TimelineCanvasProps {
  events: TimelineEvent[];
  categories: TimelineCategory[];
  activeCategoryIds: string[];
  height?: number;
  onSelectEvent?: (event: TimelineEvent) => void;
}

interface LayoutPosition {
  event: TimelineEvent;
  x: number;
}

interface LayoutTick {
  x: number;
  label: string;
}

interface LayoutCache {
  positions: LayoutPosition[];
  ticks: LayoutTick[];
  signature: string;
}

const TICK_STEPS = [
  1_000,
  5_000,
  15_000,
  30_000,
  60_000,
  5 * 60_000,
  15 * 60_000,
  30 * 60_000,
  60 * 60_000,
  2 * 60 * 60_000,
  6 * 60 * 60_000,
  12 * 60 * 60_000,
  24 * 60 * 60_000,
  3 * 24 * 60 * 60_000,
  7 * 24 * 60 * 60_000,
];

const clampRatio = (value: number): number => Math.min(1, Math.max(0, value));

const buildSignature = (events: TimelineEvent[]): string =>
  events.map((event) => `${event.id}:${event.timestamp}`).join('|');

const computeTickStep = (targetMs: number): number => {
  for (const step of TICK_STEPS) {
    if (step >= targetMs) {
      return step;
    }
  }
  return TICK_STEPS[TICK_STEPS.length - 1];
};

const formatTickLabel = (ms: number, granularityMs: number): string => {
  const date = new Date(ms);
  if (granularityMs >= 24 * 60 * 60_000) {
    return date.toLocaleDateString();
  }
  if (granularityMs >= 60 * 60_000) {
    return date.toLocaleTimeString([], { hour: '2-digit' });
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const computeTicks = (
  viewportStartMs: number,
  viewportMs: number,
  width: number
): LayoutTick[] => {
  if (!Number.isFinite(viewportMs) || viewportMs <= 0 || width <= 0) {
    return [];
  }
  const target = viewportMs / 6;
  const step = computeTickStep(target);
  const firstTick = Math.floor(viewportStartMs / step) * step;
  const ticks: LayoutTick[] = [];
  for (
    let tick = firstTick;
    tick <= viewportStartMs + viewportMs + step;
    tick += step
  ) {
    const x = ((tick - viewportStartMs) / viewportMs) * width;
    ticks.push({ x, label: formatTickLabel(tick, step) });
  }
  return ticks;
};

const TimelineCanvas: React.FC<TimelineCanvasProps> = ({
  events,
  categories,
  activeCategoryIds,
  height = 160,
  onSelectEvent,
}) => {
  const [state, dispatch] = useReducer(
    timelineReducer,
    activeCategoryIds,
    createInitialTimelineState
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutCacheRef = useRef<Map<string, LayoutCache>>(new Map());
  const pointerState = useRef<{ dragging: boolean; lastX: number }>(
    { dragging: false, lastX: 0 }
  );
  const autoFitRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
    [events]
  );

  const activeSet = useMemo(
    () => new Set(activeCategoryIds),
    [activeCategoryIds]
  );

  const filteredEvents = useMemo(() => {
    if (activeSet.size === 0) {
      return [];
    }
    return sortedEvents.filter((event) => activeSet.has(event.categoryId));
  }, [activeSet, sortedEvents]);

  const fallbackEvents = filteredEvents.length > 0 ? filteredEvents : sortedEvents;

  const range = useMemo(() => {
    if (fallbackEvents.length === 0) {
      const now = Date.now();
      return { start: now, end: now + 1 };
    }
    const first = new Date(fallbackEvents[0].timestamp).getTime();
    const last = new Date(
      fallbackEvents[fallbackEvents.length - 1].timestamp
    ).getTime();
    return { start: first, end: Math.max(last, first + 1) };
  }, [fallbackEvents]);

  const totalDurationMs = Math.max(1, range.end - range.start);

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const filteredSignature = useMemo(
    () => buildSignature(filteredEvents),
    [filteredEvents]
  );
  const eventsSignature = useMemo(
    () => buildSignature(sortedEvents),
    [sortedEvents]
  );

  useEffect(() => {
    layoutCacheRef.current.clear();
  }, [eventsSignature, filteredSignature]);

  useEffect(() => {
    dispatch({
      type: 'SET_ACTIVE_CATEGORIES',
      categoryIds: activeCategoryIds,
      totalDurationMs,
    });
  }, [activeCategoryIds, totalDurationMs]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = entry.contentRect.width;
      dispatch({ type: 'SET_VIEWPORT_WIDTH', width, totalDurationMs });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [totalDurationMs]);

  useEffect(() => {
    if (state.hasInteracted) {
      autoFitRef.current = null;
      return;
    }
    if (state.viewportWidth <= 0) return;
    if (autoFitRef.current === totalDurationMs) return;
    autoFitRef.current = totalDurationMs;
    dispatch({ type: 'AUTO_FIT', totalDurationMs });
  }, [state.viewportWidth, state.hasInteracted, totalDurationMs]);

  const layout = useMemo(() => {
    const width = Math.max(1, state.viewportWidth);
    const cacheKey = `${width}:${state.msPerPixel}:${state.offsetMs}`;
    const cached = layoutCacheRef.current.get(cacheKey);
    if (cached && cached.signature === filteredSignature) {
      return cached;
    }
    const viewportMs = state.msPerPixel * width;
    const viewportStart = range.start + state.offsetMs;
    const positions: LayoutPosition[] = [];
    filteredEvents.forEach((event) => {
      const time = new Date(event.timestamp).getTime();
      const x = (time - viewportStart) / state.msPerPixel;
      if (x >= -32 && x <= width + 32) {
        positions.push({ event, x });
      }
    });
    const ticks = computeTicks(viewportStart, viewportMs, width);
    const computed: LayoutCache = {
      positions,
      ticks,
      signature: filteredSignature,
    };
    layoutCacheRef.current.set(cacheKey, computed);
    return computed;
  }, [
    filteredEvents,
    filteredSignature,
    range.start,
    state.msPerPixel,
    state.offsetMs,
    state.viewportWidth,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = state.viewportWidth;
    if (width <= 0) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const dpr = window.devicePixelRatio ?? 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(dpr, dpr);

    const gradient = context.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#111827');
    gradient.addColorStop(1, '#1f2937');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = '#9ca3af';
    context.globalAlpha = 0.35;
    context.beginPath();
    context.moveTo(0, height - 32);
    context.lineTo(width, height - 32);
    context.stroke();
    context.globalAlpha = 1;

    context.font = '11px Inter, system-ui, sans-serif';
    context.fillStyle = '#d1d5db';

    layout.ticks.forEach((tick) => {
      if (tick.x < -5 || tick.x > width + 5) return;
      context.globalAlpha = 0.25;
      context.fillRect(tick.x, 16, 1, height - 56);
      context.globalAlpha = 1;
      context.fillText(tick.label, tick.x + 4, height - 12);
    });

    layout.positions.forEach(({ event, x }) => {
      const category = categoryMap.get(event.categoryId);
      const color = category?.color ?? '#f97316';
      if (x < -10 || x > width + 10) return;
      context.fillStyle = color;
      context.fillRect(x - 1, 24, 2, height - 64);
      context.beginPath();
      context.arc(x, 24, 4, 0, Math.PI * 2);
      context.fill();
    });

    if (hoveredId) {
      const hovered = layout.positions.find(
        (position) => position.event.id === hoveredId
      );
      if (hovered) {
        const category = categoryMap.get(hovered.event.categoryId);
        const color = category?.color ?? '#fb923c';
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(hovered.x, 24, 7, 0, Math.PI * 2);
        context.stroke();
      }
    }
  }, [categoryMap, height, hoveredId, layout, state.viewportWidth]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      pointerState.current.dragging = true;
      pointerState.current.lastX = event.clientX;
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!pointerState.current.dragging) return;
      const deltaPx = pointerState.current.lastX - event.clientX;
      pointerState.current.lastX = event.clientX;
      if (deltaPx === 0) return;
      dispatch({
        type: 'PAN',
        deltaMs: deltaPx * state.msPerPixel,
        totalDurationMs,
      });
    },
    [state.msPerPixel, totalDurationMs]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!pointerState.current.dragging) return;
      pointerState.current.dragging = false;
      setIsDragging(false);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    []
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (state.viewportWidth <= 0) return;
      event.preventDefault();
      const width = state.viewportWidth;
      const rect = containerRef.current?.getBoundingClientRect();
      const ratio = rect
        ? clampRatio((event.clientX - rect.left) / width)
        : 0.5;
      if (event.ctrlKey || event.metaKey) {
        const factor = event.deltaY < 0 ? 1.2 : 0.8333333333;
        dispatch({
          type: 'ZOOM_BY_FACTOR',
          factor,
          focusRatio: ratio,
          totalDurationMs,
        });
      } else {
        dispatch({
          type: 'PAN',
          deltaMs: event.deltaY * state.msPerPixel,
          totalDurationMs,
        });
      }
    },
    [state.viewportWidth, state.msPerPixel, totalDurationMs]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        dispatch({
          type: 'ZOOM_BY_FACTOR',
          factor: 1.2,
          focusRatio: 0.5,
          totalDurationMs,
        });
        return;
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        dispatch({
          type: 'ZOOM_BY_FACTOR',
          factor: 0.8333333333,
          focusRatio: 0.5,
          totalDurationMs,
        });
        return;
      }
      if (event.key === '0') {
        event.preventDefault();
        autoFitRef.current = null;
        dispatch({ type: 'AUTO_FIT', totalDurationMs });
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        dispatch({
          type: 'PAN',
          deltaMs: -state.msPerPixel * 40,
          totalDurationMs,
        });
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        dispatch({
          type: 'PAN',
          deltaMs: state.msPerPixel * 40,
          totalDurationMs,
        });
      }
    },
    [state.msPerPixel, totalDurationMs]
  );

  const hoveredEvent = useMemo(() => {
    if (!hoveredId) return null;
    return filteredEvents.find((event) => event.id === hoveredId) ?? null;
  }, [filteredEvents, hoveredId]);

  const hoveredCategory = hoveredEvent
    ? categoryMap.get(hoveredEvent.categoryId)
    : undefined;

  const canvasClassName = `w-full rounded bg-ub-grey ${
    isDragging ? 'cursor-grabbing' : 'cursor-grab'
  }`;

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      style={{ touchAction: 'none' }}
      aria-label="Forensic timeline"
      onMouseLeave={() => setHoveredId(null)}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-hidden={filteredEvents.length === 0}
        className={canvasClassName}
        height={height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <div className="pointer-events-none absolute inset-0">
        {layout.positions.map(({ event, x }) => {
          const category = categoryMap.get(event.categoryId);
          const color = category?.color ?? '#f97316';
          return (
            <button
              key={event.id}
              type="button"
              className="pointer-events-auto absolute top-3 h-3 w-3 -translate-x-1/2 rounded-full border border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              style={{ left: `${x}px`, backgroundColor: color }}
              title={event.title}
              onClick={() => onSelectEvent?.(event)}
              onMouseEnter={() => setHoveredId(event.id)}
              onMouseLeave={() =>
                setHoveredId((current) => (current === event.id ? null : current))
              }
              onFocus={() => setHoveredId(event.id)}
              onBlur={() =>
                setHoveredId((current) => (current === event.id ? null : current))
              }
              aria-label={`${new Date(event.timestamp).toLocaleString()} – ${
                event.title
              }`}
            />
          );
        })}
      </div>
      {filteredEvents.length === 0 && (
        <p className="mt-2 text-xs text-ubt-muted">
          No events matched the selected categories. Toggle a category to
          repopulate the timeline.
        </p>
      )}
      {hoveredEvent && (
        <div className="mt-3 space-y-1 rounded border border-ub-cool-grey bg-ub-grey/80 px-3 py-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">{hoveredEvent.title}</span>
            {hoveredCategory && (
              <span
                className="text-[10px] uppercase tracking-wide"
                style={{ color: hoveredCategory.color }}
              >
                {hoveredCategory.label}
              </span>
            )}
          </div>
          <div className="text-ubt-muted">
            {new Date(hoveredEvent.timestamp).toLocaleString()}
            {hoveredEvent.endTimestamp && (
              <>
                {' '}
                –
                {' '}
                {new Date(hoveredEvent.endTimestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </>
            )}
          </div>
          <p className="text-ubt-muted">{hoveredEvent.summary}</p>
          {hoveredEvent.sources && hoveredEvent.sources.length > 0 && (
            <div className="text-[10px] uppercase tracking-wide text-ub-orange">
              Sources: {hoveredEvent.sources.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimelineCanvas;
