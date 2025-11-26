import runs from '../data/attempt-analytics.json';
import {
  buildAggregations,
  buildChartSeries,
  diffAttemptRuns,
  estimateVirtualizedFrameCost,
  filterAttempts,
  flattenRuns,
  sanitizeAttemptsForExport,
  type AttemptRun,
} from '../utils/attemptAnalytics';

describe('attempt analytics utilities', () => {
  const dataset = runs as AttemptRun[];
  const attempts = flattenRuns(dataset);

  it('aggregates counts by target, protocol, and status', () => {
    const aggregations = buildAggregations(attempts);
    expect(aggregations.byTarget.get('Customer Portal')).toBe(3);
    expect(aggregations.byProtocol.get('HTTPS')).toBe(7);
    expect(aggregations.byStatus.get('success')).toBe(3);
  });

  it('produces sorted chart series', () => {
    const chartSeries = buildChartSeries(buildAggregations(attempts));
    expect(chartSeries.status[0]).toMatchObject({ label: 'blocked', value: 5 });
    expect(chartSeries.target.at(-1)?.value).toBeGreaterThan(0);
  });

  it('filters attempts by multiple criteria', () => {
    const filtered = filterAttempts(attempts, {
      statuses: ['success'],
      protocols: ['HTTPS'],
      runIds: dataset.map((run) => run.runId),
      search: '',
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.every((attempt) => attempt.status === 'success')).toBe(true);
    expect(filtered.every((attempt) => attempt.protocol === 'HTTPS')).toBe(true);
  });

  it('supports fuzzy search matching', () => {
    const filtered = filterAttempts(attempts, {
      statuses: [],
      protocols: [],
      runIds: dataset.map((run) => run.runId),
      search: 'broker',
    });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((attempt) => attempt.target.toLowerCase().includes('broker'))).toBe(true);
  });

  it('computes diff metrics between runs', () => {
    const diff = diffAttemptRuns(dataset[0], dataset[1]);
    expect(diff.delta.protocol.AMQP).toBe(1);
    expect(diff.delta.status.detected).toBe(1);
    expect(diff.delta.successRate).toBeCloseTo(-5, 1);
  });

  it('estimates virtualization cost below the 16ms frame budget', () => {
    const estimate = estimateVirtualizedFrameCost({
      viewportHeight: 432,
      itemHeight: 72,
      overscan: 4,
    });
    expect(estimate).toBeLessThan(16);
  });

  it('sanitizes exports by stripping restricted attempts and notes', () => {
    const sanitized = sanitizeAttemptsForExport(attempts);
    expect(sanitized.length).toBe(12);
    expect(sanitized.every((attempt) => attempt.sensitivity !== 'restricted')).toBe(true);
    expect(sanitized.every((attempt) => !('notes' in attempt))).toBe(true);
  });
});
