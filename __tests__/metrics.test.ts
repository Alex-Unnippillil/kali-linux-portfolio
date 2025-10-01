import {
  __testing,
  getMetricSummary,
  getRollingSeries,
  recordRowsRendered,
  recordWorkerTime,
  recordWebVitalMetric,
  updateMetricsConsent,
} from '../utils/metrics';

describe('metrics utility', () => {
  const originalNow = Date.now;

  beforeEach(() => {
    __testing.reset();
    updateMetricsConsent({ analyticsEnabled: true, allowNetwork: true });
  });

  afterEach(() => {
    __testing.reset();
    jest.useRealTimers();
    Date.now = originalNow;
    window.localStorage.clear();
  });

  it('aggregates samples and computes rolling percentiles', () => {
    const base = 1_700_000_000_000;
    let current = base;
    Date.now = jest.fn(() => current);

    recordRowsRendered(100);
    current += 1000;
    recordRowsRendered(150);
    current += 1000;
    recordRowsRendered(90);
    current += 500;
    recordWorkerTime(25.4);
    current += 500;
    recordWorkerTime(40.1);
    current += 500;
    recordWebVitalMetric('LCP', 2200, { id: 'test' });

    __testing.forceFlush();

    const summary = getMetricSummary('rowsRendered', 10 * 60 * 1000);
    expect(summary.count).toBe(3);
    expect(summary.p75).toBeCloseTo(125);
    expect(summary.p95).toBeCloseTo(145);

    const workerSummary = getMetricSummary('workerTime', 10 * 60 * 1000);
    expect(workerSummary.count).toBe(2);
    expect(workerSummary.p95).toBeCloseTo(39.19, 2);

    const series = getRollingSeries('rowsRendered', 10 * 60 * 1000, 4);
    expect(series).toHaveLength(4);
    expect(series.some((point) => point.count > 0)).toBe(true);

    const state = __testing.getState();
    expect(state.buffer).toHaveLength(0);
    expect(state.persisted.length).toBeGreaterThanOrEqual(1);
  });

  it('stops recording when consent is revoked', () => {
    Date.now = jest.fn(() => 1_700_000_000_000);

    recordRowsRendered(200);
    __testing.forceFlush();
    expect(getMetricSummary('rowsRendered', 60_000).count).toBe(1);

    updateMetricsConsent({ allowNetwork: false });
    const summaryAfterDisable = getMetricSummary('rowsRendered', 60_000);
    expect(summaryAfterDisable.count).toBe(0);

    const state = __testing.getState();
    expect(state.buffer).toHaveLength(0);
    expect(state.persisted).toHaveLength(0);

    recordRowsRendered(300);
    expect(getMetricSummary('rowsRendered', 60_000).count).toBe(0);
  });
});

