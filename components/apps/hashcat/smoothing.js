const clamp = (value, min, max) => {
  if (!Number.isFinite(value)) return min;
  if (Number.isFinite(min)) value = Math.max(min, value);
  if (Number.isFinite(max)) value = Math.min(max, value);
  return value;
};

const Z_SCORE = {
  0.95: 1.96,
  0.99: 2.576,
};

export const TICK_INTERVAL_MS = 50;

export const SMOOTHING_PRESETS = {
  gentle: { id: 'gentle', label: 'Gentle (high smoothing)', alpha: 0.2, windowSize: 30 },
  balanced: { id: 'balanced', label: 'Balanced', alpha: 0.4, windowSize: 20 },
  responsive: { id: 'responsive', label: 'Responsive (low smoothing)', alpha: 0.65, windowSize: 12 },
};

const clampAlpha = (alpha) => {
  if (!Number.isFinite(alpha)) return 0.4;
  return Math.min(0.95, Math.max(0.05, alpha));
};

export class AdaptiveSmoother {
  constructor({ alpha = 0.4, windowSize = 20 } = {}) {
    this.alpha = clampAlpha(alpha);
    this.windowSize = Math.max(3, Math.floor(windowSize));
    this.samples = [];
    this.smoothed = null;
    this.stdDev = 0;
  }

  update(value) {
    if (!Number.isFinite(value)) {
      return this.smoothed ?? 0;
    }
    if (this.smoothed === null) {
      this.smoothed = value;
    } else {
      this.smoothed =
        this.alpha * value + (1 - this.alpha) * this.smoothed;
    }

    this.samples.push(value);
    if (this.samples.length > this.windowSize) {
      this.samples.shift();
    }

    const mean =
      this.samples.reduce((acc, sample) => acc + sample, 0) /
      this.samples.length;

    const variance =
      this.samples.reduce((acc, sample) => acc + (sample - mean) ** 2, 0) /
      Math.max(1, this.samples.length - 1);

    this.stdDev = Math.sqrt(variance);

    return this.smoothed;
  }

  getConfidenceInterval(confidence = 0.95, bounds) {
    if (this.smoothed === null) {
      return createStaticConfidence(0, bounds);
    }

    const z = Z_SCORE[confidence] ?? Z_SCORE[0.95];
    const margin = this.stdDev * z;
    const min = bounds?.min ?? -Infinity;
    const max = bounds?.max ?? Infinity;
    const lower = clamp(this.smoothed - margin, min, max);
    const upper = clamp(this.smoothed + margin, min, max);

    return {
      lower,
      upper,
      margin: upper - lower > 0 ? (upper - lower) / 2 : 0,
      stdDev: this.stdDev,
      smoothed: clamp(this.smoothed, min, max),
    };
  }
}

export const createStaticConfidence = (value, bounds) => {
  const min = bounds?.min ?? -Infinity;
  const max = bounds?.max ?? Infinity;
  const clamped = clamp(value, min, max);
  return {
    lower: clamped,
    upper: clamped,
    margin: 0,
    stdDev: 0,
    smoothed: clamped,
  };
};

export const getPresetById = (presetId) =>
  SMOOTHING_PRESETS[presetId] ?? SMOOTHING_PRESETS.balanced;

