import {
  applyTaskFilters,
  calculateFilterMetrics,
  createInitialFilterState,
  summarizeFilteredData,
  taskFilterReducer,
} from '../components/apps/openvas/taskFilters';

const sampleData = [
  { status: 'success', latency: 220 },
  { status: 'fail', latency: 1400 },
  { status: 'success', latency: 780 },
  { status: 'fail', latency: 320 },
];

describe('openvas task filter state', () => {
  it('toggles status filters without mutating other keys', () => {
    const initial = createInitialFilterState();
    const next = taskFilterReducer(initial, {
      type: 'toggle-status',
      status: 'success',
      enabled: false,
    });
    expect(next.statuses.success).toBe(false);
    expect(next.statuses.fail).toBe(true);
    // Ensure the original state is not mutated and unrelated keys are preserved.
    expect(initial.statuses.success).toBe(true);
    expect(next.maxLatency).toBeNull();
  });

  it('applies status and latency filters with logical AND', () => {
    const state = {
      statuses: { success: false, fail: true },
      maxLatency: 300,
    };
    const result = applyTaskFilters(sampleData, state);
    expect(result).toHaveLength(0);

    const relaxed = {
      statuses: { success: false, fail: true },
      maxLatency: 400,
    };
    const relaxedResult = applyTaskFilters(sampleData, relaxed);
    expect(relaxedResult).toHaveLength(1);
    expect(relaxedResult[0].latency).toBe(320);
  });

  it('summarizes filtered data based on calculated metrics', () => {
    const metrics = calculateFilterMetrics(sampleData);
    expect(metrics).toMatchObject({
      total: 4,
      success: 2,
      fail: 2,
    });
    const summary = summarizeFilteredData(sampleData, metrics);
    expect(summary).toContain('Showing 4 runs');
    expect(summary).toContain('Success: 2');
    expect(summary).toContain('Failure: 2');
  });
});
