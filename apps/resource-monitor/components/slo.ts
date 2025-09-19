import sloConfig from '@/data/slo.json';
import { HistoryEntry } from './history';

type Direction = 'gte' | 'lte';

type SloIndicator = 'availability' | 'latency' | 'errorRate';

export interface SloConfig {
  id: string;
  title: string;
  indicator: SloIndicator;
  target: number;
  direction: Direction;
  unit: string;
  precision?: number;
  description: string;
  notes?: string[];
  breachNote: string;
  windowHours?: number;
}

export interface NormalizedSloConfig extends SloConfig {
  precision: number;
  windowHours: number;
}

export interface SloComputation {
  config: NormalizedSloConfig;
  value: number | null;
  breached: boolean;
  notes: string[];
  sampleSize: number;
}

const DEFAULT_WINDOW_HOURS = 24;
const DEFAULT_PERCENT_PRECISION = 2;
const indicators: SloIndicator[] = ['availability', 'latency', 'errorRate'];

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isDirection = (value: unknown): value is Direction => value === 'gte' || value === 'lte';

const isIndicator = (value: unknown): value is SloIndicator =>
  typeof value === 'string' && indicators.includes(value as SloIndicator);

const toNormalizedConfig = (config: SloConfig): NormalizedSloConfig => ({
  ...config,
  precision:
    typeof config.precision === 'number'
      ? config.precision
      : config.unit === '%' ? DEFAULT_PERCENT_PRECISION : 0,
  windowHours: typeof config.windowHours === 'number' ? config.windowHours : DEFAULT_WINDOW_HOURS,
});

export const SLO_CONFIGS: NormalizedSloConfig[] = (sloConfig as unknown as SloConfig[])
  .filter(
    (config) =>
      config &&
      typeof config.id === 'string' &&
      typeof config.title === 'string' &&
      isIndicator(config.indicator) &&
      isFiniteNumber(config.target) &&
      isDirection(config.direction) &&
      typeof config.unit === 'string' &&
      typeof config.description === 'string' &&
      typeof config.breachNote === 'string',
  )
  .map(toNormalizedConfig);

const percentile = (values: number[], percentileRank: number): number => {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (percentileRank / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower];
  const weight = rank - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

const isFailure = (entry: HistoryEntry): boolean => {
  if (entry.error) return true;
  if (!isFiniteNumber(entry.status)) return false;
  if (entry.status === 0) return true;
  if (entry.status >= 500) return true;
  if (entry.status < 200) return true;
  return false;
};

const formatWithUnit = (value: number, config: NormalizedSloConfig): string => {
  const fixed = value.toFixed(config.precision);
  if (!config.unit) return fixed;
  if (config.unit === '%') return `${fixed}${config.unit}`;
  return `${fixed} ${config.unit}`;
};

export const formatMetric = (value: number | null, config: NormalizedSloConfig): string =>
  value == null ? '—' : formatWithUnit(value, config);

export const computeSlo = (
  config: NormalizedSloConfig,
  entries: HistoryEntry[],
  now = Date.now(),
): SloComputation => {
  const windowMs = config.windowHours * 60 * 60 * 1000;
  const windowStart = now - windowMs;
  const windowEntries = entries.filter((entry) => entry.timestamp >= windowStart);
  const sampleSize = windowEntries.length;

  if (sampleSize === 0) {
    return {
      config,
      value: null,
      breached: false,
      notes: [...(config.notes ?? [])],
      sampleSize: 0,
    };
  }

  const successes = windowEntries.filter((entry) => !isFailure(entry));
  const failures = sampleSize - successes.length;

  let value: number | null = null;
  switch (config.indicator) {
    case 'availability':
      value = (successes.length / sampleSize) * 100;
      break;
    case 'errorRate':
      value = (failures / sampleSize) * 100;
      break;
    case 'latency': {
      const durations = successes
        .map((entry) => entry.duration)
        .filter((duration): duration is number => isFiniteNumber(duration) && duration >= 0);
      value = durations.length > 0 ? percentile(durations, 95) : null;
      break;
    }
    default:
      value = null;
  }

  const breached =
    value != null &&
    (config.direction === 'gte' ? value < config.target : value > config.target);

  const notes = [...(config.notes ?? [])];
  if (breached) notes.push(config.breachNote);

  return {
    config,
    value,
    breached,
    notes,
    sampleSize,
  };
};

export const computeSloSummaries = (
  entries: HistoryEntry[],
  configs: NormalizedSloConfig[] = SLO_CONFIGS,
  now = Date.now(),
): SloComputation[] => configs.map((config) => computeSlo(config, entries, now));
