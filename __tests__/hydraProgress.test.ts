import { computeEtaMetrics, ProgressAttempt } from '../apps/hydra/components/Progress';

const buildAttempts = (durations: number[]): ProgressAttempt[] => {
  let elapsed = 0;
  return durations.map((duration) => {
    elapsed += duration;
    return { time: parseFloat(elapsed.toFixed(4)) };
  });
};

describe('Hydra progress ETA', () => {
  it('uses the first five percent window to establish the baseline', () => {
    const attempts = buildAttempts(Array(10).fill(0.5));
    const metrics = computeEtaMetrics(attempts, 100);

    expect(metrics.windowSize).toBe(5);
    expect(metrics.averageDuration).toBeCloseTo(0.5, 2);
    expect(metrics.etaSeconds).toBeCloseTo(45, 1);
    expect(metrics.stability).toBe('high');
  });

  it('converges ETA toward zero as the run completes', () => {
    const durations = Array(100).fill(1);
    const attempts = buildAttempts(durations);

    const midRunMetrics = computeEtaMetrics(attempts.slice(0, 95), 100);
    const finalMetrics = computeEtaMetrics(attempts, 100);

    expect(midRunMetrics.etaSeconds).toBeCloseTo(5, 5);
    expect(finalMetrics.etaSeconds).toBe(0);
    expect(finalMetrics.remaining).toBe(0);
  });

  it('dampens sudden spikes by using the moving average window', () => {
    const baselineDurations = Array(5).fill(1);
    const baselineMetrics = computeEtaMetrics(buildAttempts(baselineDurations), 100);

    const withSpike = buildAttempts([...baselineDurations, 5]);
    const metricsAfterSpike = computeEtaMetrics(withSpike, 100);

    expect(metricsAfterSpike.averageDuration).toBeGreaterThan(
      baselineMetrics.averageDuration ?? 0
    );
    expect(
      (metricsAfterSpike.averageDuration ?? 0) - (baselineMetrics.averageDuration ?? 0)
    ).toBeLessThan(1);
    expect(metricsAfterSpike.stability === 'low' || metricsAfterSpike.stability === 'medium').toBe(
      true
    );
  });
});
