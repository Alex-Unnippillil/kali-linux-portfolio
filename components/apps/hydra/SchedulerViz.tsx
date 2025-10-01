import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const roundToMillis = (value: number) =>
  Math.round((value + Number.EPSILON) * 1000) / 1000;

export const createDeterministicRng = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export type FlowConfig = {
  id: number;
  name: string;
  description: string;
  color: string;
};

const FLOW_CONFIGS: FlowConfig[] = [
  {
    id: 0,
    name: 'SSH logins',
    description: 'Interactive brute force attempts over SSH sessions.',
    color: 'bg-rose-500',
  },
  {
    id: 1,
    name: 'Web form posts',
    description: 'Credential stuffing against HTTP form endpoints.',
    color: 'bg-sky-500',
  },
  {
    id: 2,
    name: 'API keys',
    description: 'Token rotation attacks on REST APIs.',
    color: 'bg-emerald-500',
  },
];

export type SchedulerSegment = {
  flowId: number;
  start: number;
  finish: number;
  duration: number;
  arrival: number;
  finishTag: number;
  packetIndex: number;
};

export type SchedulerResult = {
  segments: SchedulerSegment[];
  totalDuration: number;
};

export type SchedulerOptions = {
  packetsPerFlow?: number;
  baseSpacing?: number;
  jitter?: number;
  sizeRange?: [number, number];
};

export const simulateWFQSchedule = (
  weights: number[],
  seed: number,
  options: SchedulerOptions = {}
): SchedulerResult => {
  const flowCount = weights.length;
  if (flowCount === 0) {
    return { segments: [], totalDuration: 0 };
  }

  const packetsPerFlow = options.packetsPerFlow ?? 5;
  const baseSpacing = options.baseSpacing ?? 0.6;
  const jitter = options.jitter ?? 1.2;
  const [minSize, maxSize] = options.sizeRange ?? [0.6, 1.2];

  const rng = createDeterministicRng(seed);
  const packets: Array<{
    flowId: number;
    arrival: number;
    size: number;
    packetIndex: number;
  }> = [];

  for (let flowId = 0; flowId < flowCount; flowId++) {
    let arrivalCursor = rng() * baseSpacing;
    for (let packetIndex = 0; packetIndex < packetsPerFlow; packetIndex++) {
      arrivalCursor += baseSpacing + rng() * jitter;
      const size = minSize + rng() * (maxSize - minSize);
      packets.push({
        flowId,
        arrival: roundToMillis(arrivalCursor),
        size: roundToMillis(size),
        packetIndex,
      });
    }
  }

  packets.sort((a, b) => {
    if (a.arrival === b.arrival) {
      if (a.flowId === b.flowId) {
        return a.packetIndex - b.packetIndex;
      }
      return a.flowId - b.flowId;
    }
    return a.arrival - b.arrival;
  });

  const queue: Array<{
    flowId: number;
    arrival: number;
    size: number;
    packetIndex: number;
    finishTag: number;
  }> = [];

  const lastFinishTags = new Array(flowCount).fill(0);
  const segments: SchedulerSegment[] = [];
  let virtualTime = packets[0]?.arrival ?? 0;
  let time = packets[0]?.arrival ?? 0;
  let nextIndex = 0;

  const addArrivalsUntil = (limit: number) => {
    while (nextIndex < packets.length && packets[nextIndex].arrival <= limit) {
      const packet = packets[nextIndex];
      virtualTime = Math.max(virtualTime, packet.arrival);
      const startTag = Math.max(lastFinishTags[packet.flowId], virtualTime);
      const finishTag = startTag + packet.size / Math.max(weights[packet.flowId], 0.0001);
      lastFinishTags[packet.flowId] = finishTag;
      queue.push({ ...packet, finishTag });
      nextIndex++;
    }
  };

  while (nextIndex < packets.length || queue.length) {
    if (!queue.length && nextIndex < packets.length) {
      time = packets[nextIndex].arrival;
      virtualTime = Math.max(virtualTime, time);
    }

    addArrivalsUntil(time + 1e-6);

    if (!queue.length) {
      if (nextIndex < packets.length) {
        const jumpTarget = packets[nextIndex].arrival;
        addArrivalsUntil(jumpTarget);
        time = jumpTarget;
      }
      continue;
    }

    queue.sort((a, b) => {
      if (a.finishTag === b.finishTag) {
        if (a.arrival === b.arrival) {
          return a.flowId - b.flowId;
        }
        return a.arrival - b.arrival;
      }
      return a.finishTag - b.finishTag;
    });

    const next = queue.shift()!;
    const start = Math.max(time, next.arrival);
    const duration = next.size;
    const finish = start + duration;
    time = finish;
    virtualTime = Math.max(virtualTime, next.finishTag);

    segments.push({
      flowId: next.flowId,
      start: roundToMillis(start),
      finish: roundToMillis(finish),
      duration: roundToMillis(duration),
      arrival: roundToMillis(next.arrival),
      finishTag: roundToMillis(next.finishTag),
      packetIndex: next.packetIndex,
    });
  }

  const totalDuration = segments.length
    ? roundToMillis(segments[segments.length - 1].finish)
    : 0;

  return {
    segments,
    totalDuration,
  };
};

const SchedulerViz: React.FC = () => {
  const [weights, setWeights] = useState<number[]>(() =>
    FLOW_CONFIGS.map(() => 3)
  );
  const [seed, setSeed] = useState<number>(2024);
  const [isPlaying, setIsPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const frameRef = useRef<number>();

  const schedule = useMemo(
    () => simulateWFQSchedule(weights, seed, { packetsPerFlow: 6 }),
    [weights, seed]
  );

  const total = Math.max(schedule.totalDuration, 0.0001);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    const handler = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    if (media.addEventListener) {
      media.addEventListener('change', handler);
    } else {
      // @ts-ignore older browsers
      media.addListener(handler);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', handler);
      } else {
        // @ts-ignore older browsers
        media.removeListener(handler);
      }
    };
  }, []);

  useEffect(() => {
    setElapsed(0);
  }, [weights, seed]);

  useEffect(() => {
    if (reducedMotion || !isPlaying) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      return;
    }

    let lastTime = performance.now();
    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      setElapsed((prev) => {
        const next = Math.min(prev + delta, total);
        return next;
      });
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isPlaying, total, reducedMotion]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    if (elapsed >= schedule.totalDuration && schedule.totalDuration > 0) {
      setIsPlaying(false);
    }
  }, [elapsed, schedule.totalDuration, isPlaying]);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const currentSegment = useMemo(() => {
    return schedule.segments.find(
      (segment) => elapsed >= segment.start && elapsed < segment.finish
    );
  }, [elapsed, schedule.segments]);

  return (
    <section className="mt-6 rounded-lg border border-gray-700 bg-gray-900 p-4 shadow-lg">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Weighted Fair Queueing Scheduler
          </h3>
          <p className="text-sm text-gray-300">
            Adjust queue weights to see how packets from different attack
            campaigns share execution time. The timeline simulates a weighted
            fair queue serviced at a constant rate.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (isPlaying) {
              setIsPlaying(false);
            } else {
              if (elapsed >= schedule.totalDuration) {
                setElapsed(0);
              }
              setIsPlaying(true);
            }
          }}
          className="mt-2 inline-flex items-center rounded border border-gray-500 px-3 py-1 text-sm font-medium text-gray-100 hover:bg-gray-800"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {FLOW_CONFIGS.map((flow, index) => (
          <label key={flow.id} className="flex flex-col text-sm text-gray-200">
            <span className="mb-1 flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${flow.color}`}
                aria-hidden="true"
              />
              {flow.name}
            </span>
            <input
              type="range"
              min={1}
              max={10}
              value={weights[index]}
              onChange={(event) => {
                const nextWeights = [...weights];
                nextWeights[index] = Number(event.target.value);
                setWeights(nextWeights);
              }}
              aria-label={`${flow.name} weight`}
              className="accent-yellow-400"
            />
            <span className="mt-1 text-xs text-gray-400">
              Weight: {weights[index]}
            </span>
            <span className="mt-1 text-xs text-gray-500">
              {flow.description}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-200">
        <label className="flex items-center gap-2">
          <span className="text-gray-300">Seed</span>
          <input
            type="number"
            value={seed}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) {
                return;
              }
              setSeed(value);
            }}
            className="w-24 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-gray-100"
          />
        </label>
        <div className="text-xs text-gray-400">
          Deterministic seed ensures repeatable scheduling.
        </div>
      </div>

      <div className="mt-4">
        <div className="relative h-20 rounded border border-gray-700 bg-gray-950">
          <div className="absolute inset-x-0 top-0 flex h-10 overflow-hidden">
            {schedule.segments.map((segment) => {
              const width = `${
                Math.max(segment.duration, 0.0001) / total * 100
              }%`;
              const flow = FLOW_CONFIGS[segment.flowId] ?? FLOW_CONFIGS[0];
              const isActive = currentSegment?.start === segment.start;
              return (
                <div
                  key={`${segment.flowId}-${segment.packetIndex}-${segment.start}`}
                  className={`flex items-center justify-center text-xs font-medium text-gray-900 transition-all duration-500 ease-out ${flow.color} ${
                    isActive ? 'ring-2 ring-yellow-300 ring-offset-2 ring-offset-gray-950' : ''
                  }`}
                  style={{ width }}
                  title={`${flow.name} packet ${segment.packetIndex + 1}`}
                >
                  {flow.name}
                </div>
              );
            })}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-10 border-t border-gray-800 bg-gray-900/70 text-xs text-gray-200">
            {schedule.segments.map((segment) => {
              const width = `${
                Math.max(segment.duration, 0.0001) / total * 100
              }%`;
              return (
                <div
                  key={`meta-${segment.flowId}-${segment.packetIndex}-${segment.start}`}
                  className="flex flex-col justify-center border-r border-gray-800 px-2"
                  style={{ width }}
                >
                  <span>Start: {segment.start.toFixed(2)}s</span>
                  <span>Finish: {segment.finish.toFixed(2)}s</span>
                </div>
              );
            })}
          </div>
          <div
            className="pointer-events-none absolute top-0 bottom-10 w-0.5 bg-yellow-300"
            style={{ left: `${Math.min(elapsed / total, 1) * 100}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="mt-2 text-xs text-gray-400">
          Timeline shows service order. Vertical bar indicates simulated clock
          (seconds). Higher weights allocate more contiguous service to a flow.
        </div>
      </div>

      <dl className="mt-4 grid gap-2 text-xs text-gray-300 sm:grid-cols-2">
        <div className="rounded border border-gray-700 bg-gray-950 p-2">
          <dt className="font-semibold text-gray-100">Current slot</dt>
          <dd className="mt-1 text-gray-300">
            {currentSegment ? (
              <>
                {FLOW_CONFIGS[currentSegment.flowId]?.name || 'Flow'}{' '}
                (packet {currentSegment.packetIndex + 1}) running until{' '}
                {currentSegment.finish.toFixed(2)}s
              </>
            ) : (
              'Scheduler idle'
            )}
          </dd>
        </div>
        <div className="rounded border border-gray-700 bg-gray-950 p-2">
          <dt className="font-semibold text-gray-100">Simulation notes</dt>
          <dd className="mt-1 text-gray-300">
            Weighted Fair Queueing advances virtual time per packet. Finish tags
            drive the next selection, so the same seed and weights always yield
            the same ordering.
          </dd>
        </div>
      </dl>
    </section>
  );
};

export default SchedulerViz;
