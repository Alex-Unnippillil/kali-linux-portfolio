import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import {
  TRACEROUTE_HOPS,
  createTracerouteLatencyGenerator,
  type TracerouteFrame,
} from '../mocks/traceroute';

const MAP_CENTER: LatLngExpression = [20, 10];
const MAP_BOUNDS: LatLngBoundsExpression = [
  [-75, -190],
  [85, 190],
];

const SEGMENT_COLORS = {
  active: '#38bdf8',
  complete: '#22c55e',
  pending: '#475569',
} as const;

const formatLatency = (latency: number) => (latency > 0 ? `${latency.toFixed(1)} ms` : '—');

const latencyToDuration = (latency: number) => Math.max(900, Math.min(2200, latency * 18));

export default function TracerouteMap() {
  const [isClient, setIsClient] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrame, setCurrentFrame] = useState<TracerouteFrame | null>(null);

  const baseLatencies = useMemo(() => TRACEROUTE_HOPS.map(() => 0), []);
  const latencies = currentFrame?.latencies ?? baseLatencies;
  const activeHopIndex = currentFrame?.hopIndex ?? 0;
  const frameNumber = currentFrame?.frame ?? 0;
  const currentHop = TRACEROUTE_HOPS[activeHopIndex] ?? TRACEROUTE_HOPS[0];

  const generatorRef = useRef(createTracerouteLatencyGenerator());
  const frameRef = useRef<TracerouteFrame | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const isPlayingRef = useRef(isPlaying);
  const currentDurationRef = useRef(latencyToDuration(TRACEROUTE_HOPS[0].baseLatency));

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const applyFrame = useCallback((frame: TracerouteFrame) => {
    frameRef.current = frame;
    currentDurationRef.current = latencyToDuration(frame.latency);
    setCurrentFrame(frame);
  }, []);

  useEffect(() => {
    if (!isClient) {
      return;
    }
    if (frameRef.current) {
      return;
    }

    const initial = generatorRef.current.next();
    if (!initial.done) {
      elapsedRef.current = 0;
      lastTimestampRef.current = null;
      applyFrame(initial.value);
    }
  }, [applyFrame, isClient]);

  const onFrame = useCallback(
    (timestamp: number) => {
      if (!isPlayingRef.current) {
        return;
      }

      if (lastTimestampRef.current == null) {
        lastTimestampRef.current = timestamp;
      }

      const delta = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;
      if (delta > 0) {
        elapsedRef.current += delta;
      }

      const duration = currentDurationRef.current;
      if (frameRef.current && elapsedRef.current >= duration) {
        const overshoot = elapsedRef.current - duration;
        const next = generatorRef.current.next();
        if (!next.done) {
          elapsedRef.current = overshoot;
          applyFrame(next.value);
        } else {
          elapsedRef.current = 0;
        }
      }

      if (isPlayingRef.current) {
        rafRef.current = window.requestAnimationFrame(onFrame);
      }
    },
    [applyFrame]
  );

  useEffect(() => {
    if (!isClient) {
      return;
    }

    if (isPlaying) {
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      lastTimestampRef.current = null;
      rafRef.current = window.requestAnimationFrame(onFrame);
    } else if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimestampRef.current = null;
    }

    return () => {
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isClient, isPlaying, onFrame]);

  const completedMap = useMemo(() => {
    if (!currentFrame) {
      return TRACEROUTE_HOPS.map(() => false);
    }
    if (currentFrame.hopIndex === 0) {
      return TRACEROUTE_HOPS.map(() => false);
    }
    return TRACEROUTE_HOPS.map((_, index) => index < currentFrame.hopIndex);
  }, [currentFrame]);

  const animationStateLabel = isPlaying ? 'playing' : 'paused';
  const buttonLabel = isPlaying ? 'Pause animation' : 'Resume animation';

  const totalLatencyLabel = currentFrame ? `${currentFrame.cumulativeLatency.toFixed(1)} ms` : '—';
  const currentLatencyLabel = formatLatency(currentFrame?.latency ?? 0);

  return (
    <div className="flex flex-col gap-4 text-slate-100">
      <header className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-inner md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Traceroute visualizer</h2>
          <p className="text-sm text-slate-400">
            Synthetic route tracing across major internet exchange points with animated hop metrics.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-xs text-slate-300 sm:flex-row sm:items-center">
          <div className="flex gap-4">
            <div>
              <div className="uppercase tracking-widest text-slate-500">Frame</div>
              <div data-testid="frame-index" className="text-base font-semibold text-slate-100">
                {frameNumber}
              </div>
            </div>
            <div>
              <div className="uppercase tracking-widest text-slate-500">Mode</div>
              <div data-testid="animation-state" className="text-base font-semibold capitalize text-slate-100">
                {animationStateLabel}
              </div>
            </div>
          </div>
          <div>
            <div className="uppercase tracking-widest text-slate-500">Active hop</div>
            <div className="text-sm font-medium text-slate-100">{currentHop.label}</div>
            <div className="text-xs text-slate-400">
              Hop latency: <span className="font-semibold text-slate-100">{currentLatencyLabel}</span>
            </div>
            <div className="text-xs text-slate-400">
              Cumulative: <span className="font-semibold text-slate-100">{totalLatencyLabel}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPlaying((value) => !value)}
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 font-semibold text-slate-100 shadow hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            {buttonLabel}
          </button>
        </div>
      </header>
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-2">
          {isClient ? (
            <MapContainer
              center={MAP_CENTER}
              zoom={2}
              minZoom={2}
              maxZoom={5}
              maxBounds={MAP_BOUNDS}
              scrollWheelZoom={false}
              worldCopyJump
              className="h-[320px] w-full rounded-lg"
              style={{ backgroundColor: '#020617' }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                noWrap
              />
              {TRACEROUTE_HOPS.map((hop, index) => {
                if (index === 0) {
                  return null;
                }
                const prev = TRACEROUTE_HOPS[index - 1];
                const isActive = index === activeHopIndex;
                const isComplete = completedMap[index];
                const statusColor = isActive
                  ? SEGMENT_COLORS.active
                  : isComplete
                    ? SEGMENT_COLORS.complete
                    : SEGMENT_COLORS.pending;

                return (
                  <Polyline
                    key={`segment-${prev.id}-${hop.id}`}
                    positions={[prev.coordinates, hop.coordinates]}
                    pathOptions={{
                      color: statusColor,
                      weight: isActive ? 4 : isComplete ? 3 : 2,
                      opacity: isComplete || isActive ? 0.9 : 0.45,
                      dashArray: isActive ? '10 8' : undefined,
                    }}
                  />
                );
              })}
              {TRACEROUTE_HOPS.map((hop, index) => {
                const isActive = index === activeHopIndex;
                const isComplete = completedMap[index];
                const markerColor = isActive
                  ? SEGMENT_COLORS.active
                  : isComplete
                    ? SEGMENT_COLORS.complete
                    : '#94a3b8';

                return (
                  <CircleMarker
                    key={`marker-${hop.id}`}
                    center={hop.coordinates as LatLngExpression}
                    radius={isActive ? 8 : 6}
                    pathOptions={{
                      color: markerColor,
                      weight: 2,
                      fillColor: markerColor,
                      fillOpacity: 1,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={0.9} permanent={false}>
                      <div className="space-y-1">
                        <div className="font-semibold">{hop.label}</div>
                        <div className="text-xs text-slate-300">{hop.ip}</div>
                        <div className="text-xs text-slate-300">{formatLatency(latencies[index])}</div>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          ) : (
            <div className="flex h-[320px] items-center justify-center text-sm text-slate-400">
              Initializing map…
            </div>
          )}
        </section>
        <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <h3 className="text-base font-semibold text-slate-100">Simulated hops</h3>
          <p className="mb-3 text-sm text-slate-400">
            Values stream from a deterministic generator to keep the experience in demo mode while still showing realistic
            latency jitter.
          </p>
          <ul data-testid="hop-list" className="space-y-2" aria-label="Traceroute hops">
            {TRACEROUTE_HOPS.map((hop, index) => {
              const isActive = index === activeHopIndex;
              const isComplete = completedMap[index];
              const borderColor = isActive
                ? 'border-sky-500'
                : isComplete
                  ? 'border-emerald-500'
                  : 'border-slate-800';
              const backgroundColor = isActive
                ? 'bg-sky-500/10'
                : isComplete
                  ? 'bg-emerald-500/10'
                  : 'bg-slate-900/40';

              return (
                <li
                  key={hop.id}
                  className={`rounded-lg border ${borderColor} ${backgroundColor} p-3 transition-colors`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-100">{hop.label}</div>
                      <div className="text-xs text-slate-400">{hop.location}</div>
                      <div className="text-xs text-slate-500">{hop.ip}</div>
                    </div>
                    <div
                      className="text-sm font-semibold text-slate-100"
                      data-testid={`hop-latency-${index}`}
                      aria-label={`Latency for ${hop.label}`}
                    >
                      {formatLatency(latencies[index])}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
