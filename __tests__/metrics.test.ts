import {
  setMetricsConsent,
  logFeatureUsage,
  getMetricsCounts,
  resetMetrics,
} from '../utils/metrics';

describe('metrics', () => {
  beforeEach(() => {
    localStorage.clear();
    resetMetrics();
    setMetricsConsent(false);
  });

  test('does not log without consent', () => {
    logFeatureUsage('test');
    expect(getMetricsCounts()).toEqual({});
  });

  test('logs usage with consent', () => {
    setMetricsConsent(true);
    logFeatureUsage('test');
    logFeatureUsage('test');
    expect(getMetricsCounts()).toEqual({ test: 2 });
  });
});
