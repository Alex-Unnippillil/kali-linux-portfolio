interface RuleLike {
  expression?: string;
  color?: string;
}

interface LatencySample {
  event: string;
  latency: number;
  timestamp: number;
}

interface MemorySample {
  phase: string;
  size: number;
  timestamp: number;
}

interface ChecksumSample {
  context: string;
  checksum: string;
  ruleCount: number;
  timestamp: number;
}

interface MetricsStore {
  latencies: LatencySample[];
  memorySamples: MemorySample[];
  checksums: ChecksumSample[];
}

const metrics: MetricsStore = {
  latencies: [],
  memorySamples: [],
  checksums: [],
};

const getPerformance = () =>
  typeof performance !== 'undefined'
    ? performance
    : ({
        now: () => Date.now(),
        timeOrigin: Date.now(),
      } as Performance);

const safeNow = () => getPerformance().now();

const normalizeTimestamp = (start?: number): number => {
  if (!Number.isFinite(start)) return safeNow();
  const perf = getPerformance();
  const candidate = start as number;
  if (candidate > 1e12 && typeof perf.timeOrigin === 'number') {
    const adjusted = candidate - perf.timeOrigin;
    if (Number.isFinite(adjusted)) {
      return adjusted;
    }
  }
  return candidate;
};

const approximateRuleSize = (rules: RuleLike[]) =>
  rules.reduce(
    (total, rule) =>
      total + (rule.expression?.length ?? 0) + (rule.color?.length ?? 0),
    0
  );

const computeChecksum = (rules: RuleLike[]) => {
  const normalized = rules.map((rule) => ({
    expression: rule.expression ?? '',
    color: rule.color ?? '',
  }));
  const json = JSON.stringify(normalized);
  let hash = 0;
  for (let i = 0; i < json.length; i += 1) {
    hash = (hash * 31 + json.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

export const recordLatency = (event: string, startedAt?: number): number => {
  const end = safeNow();
  const latency = Math.max(0, end - normalizeTimestamp(startedAt));
  metrics.latencies.push({ event, latency, timestamp: end });
  return latency;
};

export const recordMemorySample = (phase: string, rules: RuleLike[] = []) => {
  const perf = getPerformance();
  const perfMemory = (perf as Performance & { memory?: { usedJSHeapSize?: number } })
    .memory;
  const size = Number.isFinite(perfMemory?.usedJSHeapSize)
    ? (perfMemory?.usedJSHeapSize as number)
    : approximateRuleSize(rules);
  const timestamp = perf.now();
  metrics.memorySamples.push({ phase, size, timestamp });
  return size;
};

export const recordChecksum = (
  rules: RuleLike[],
  context: string
): string => {
  const checksum = computeChecksum(rules);
  metrics.checksums.push({
    context,
    checksum,
    ruleCount: rules.length,
    timestamp: safeNow(),
  });
  return checksum;
};

export const finalizeInteraction = (
  event: string,
  startedAt: number | undefined,
  rules: RuleLike[]
) => {
  recordLatency(event, startedAt);
  recordChecksum(rules, event);
  recordMemorySample(event, rules);
};

export const getInteractionMetrics = (): MetricsStore => ({
  latencies: [...metrics.latencies],
  memorySamples: [...metrics.memorySamples],
  checksums: [...metrics.checksums],
});

export const resetInteractionMetrics = () => {
  metrics.latencies.length = 0;
  metrics.memorySamples.length = 0;
  metrics.checksums.length = 0;
};

export const calculateChecksum = (rules: RuleLike[]) => computeChecksum(rules);

export type { RuleLike, LatencySample, MemorySample, ChecksumSample, MetricsStore };
