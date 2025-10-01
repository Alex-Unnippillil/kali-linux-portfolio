import {
  AdaptiveSmoother,
  createStaticConfidence,
  getPresetById,
  SMOOTHING_PRESETS,
  TICK_INTERVAL_MS,
} from '../../../../components/apps/hashcat/smoothing';

const bounds = { min: 0, max: 100 };

describe('AdaptiveSmoother', () => {
  it('dampens sudden changes to stabilize progress updates', () => {
    const smoother = new AdaptiveSmoother({ alpha: 0.2, windowSize: 6 });
    const rawValues = [0, 20, 10, 30, 15, 35];
    const smoothedValues = rawValues.map((value) => smoother.update(value));

    const rawVariation = rawValues
      .slice(1)
      .reduce(
        (sum, value, index) => sum + Math.abs(value - rawValues[index]),
        0
      );
    const smoothedVariation = smoothedValues
      .slice(1)
      .reduce(
        (sum, value, index) => sum + Math.abs(value - smoothedValues[index]),
        0
      );

    expect(smoothedVariation).toBeLessThan(rawVariation);
    expect(smoothedValues[smoothedValues.length - 1]).toBeLessThan(
      rawValues[rawValues.length - 1]
    );
  });

  it('shrinks confidence intervals when inputs stabilize', () => {
    const stable = new AdaptiveSmoother({ alpha: 0.4, windowSize: 12 });
    Array.from({ length: 20 }).forEach(() => stable.update(25));
    const stableInterval = stable.getConfidenceInterval(0.95, bounds);

    const jittery = new AdaptiveSmoother({ alpha: 0.4, windowSize: 12 });
    [10, 40, 20, 35, 15, 45, 18, 38, 22, 32].forEach((value) =>
      jittery.update(value)
    );
    const jitteryInterval = jittery.getConfidenceInterval(0.95, bounds);

    expect(stableInterval.margin).toBeLessThan(jitteryInterval.margin);
  });
});

describe('smoothing utilities', () => {
  it('clamps static confidence intervals to provided bounds', () => {
    const confidence = createStaticConfidence(120, bounds);
    expect(confidence.lower).toBe(bounds.max);
    expect(confidence.upper).toBe(bounds.max);
    expect(confidence.margin).toBe(0);
  });

  it('exposes presets with a balanced fallback', () => {
    expect(getPresetById('balanced')).toBe(SMOOTHING_PRESETS.balanced);
    expect(getPresetById('does-not-exist')).toBe(SMOOTHING_PRESETS.balanced);
  });

  it('keeps worker ticks at 50ms for responsive updates', () => {
    expect(TICK_INTERVAL_MS).toBe(50);
  });
});
