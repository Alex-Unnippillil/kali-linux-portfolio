import { METRIC_THRESHOLDS } from './constants';
import type { RumMetricName, RumRating } from './types';

export function getRating(name: RumMetricName, value: number): RumRating {
  const thresholds = METRIC_THRESHOLDS[name];
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}
