import { percentile } from './math';
import type { RumSample } from './types';

export function computeRollingP75(
  samples: RumSample[],
  windowSize = 20,
): number | null {
  if (!samples.length) return null;
  const window = windowSize > 0 ? samples.slice(-windowSize) : samples;
  return percentile(
    window
      .map((sample) => sample.value)
      .filter((value) => Number.isFinite(value)),
    0.75,
  );
}
