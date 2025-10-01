import { performance } from 'perf_hooks';

import {
  buildSvgPath,
  lttbDecimate,
  normalizePoints,
} from '../../utils/charting/decimator';

function createSeries(length: number) {
  return Array.from({ length }, (_, index) => ({
    x: index,
    y: Math.sin(index / 150) * 0.5 + 0.5 + (index % 97) / 500,
    sourceIndex: index,
  }));
}

describe('chart decimation utilities', () => {
  it('preserves endpoints when decimating', () => {
    const series = createSeries(5000);
    const decimated = lttbDecimate(series, 256);

    expect(decimated.length).toBeLessThanOrEqual(256);
    expect(decimated[0].sourceIndex).toBe(series[0].sourceIndex);
    expect(decimated[decimated.length - 1].sourceIndex).toBe(series[series.length - 1].sourceIndex);
  });

  it('renders a decimated 100k point series within a 16ms frame budget', () => {
    const raw = normalizePoints(createSeries(100_000));
    const decimated = lttbDecimate(raw, 512);

    expect(decimated.length).toBeLessThanOrEqual(512);

    const start = performance.now();
    const result = buildSvgPath(decimated, { width: 800, height: 200 });
    const duration = performance.now() - start;

    expect(result.d.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(16);
  });
});
