import type { RumMetricName } from './types';

export const RUM_METRICS: RumMetricName[] = ['INP', 'FID'];

export const METRIC_TARGETS: Record<RumMetricName, number> = {
  INP: 200,
  FID: 100,
};

export const METRIC_THRESHOLDS: Record<
  RumMetricName,
  { good: number; needsImprovement: number }
> = {
  INP: {
    good: 200,
    needsImprovement: 500,
  },
  FID: {
    good: 100,
    needsImprovement: 300,
  },
};

export const METRIC_LABELS: Record<RumMetricName, string> = {
  INP: 'Interaction to Next Paint',
  FID: 'First Input Delay',
};

export const MAX_HISTORY = 120;
