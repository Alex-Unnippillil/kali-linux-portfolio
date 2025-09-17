import {
  addRumSample,
  computeRollingP75,
  getRating,
  getRumState,
  resetRumStore,
  type RumSample,
} from '../src/rum';
import { MAX_HISTORY } from '../src/rum/constants';

describe('RUM utilities', () => {
  beforeEach(() => {
    resetRumStore();
  });

  it('computes rolling p75 for the provided window', () => {
    const samples: RumSample[] = [10, 30, 50, 70, 90].map((value, index) => ({
      id: `INP-${index}`,
      name: 'INP',
      value,
      rating: 'good',
      timestamp: index,
    }));

    expect(computeRollingP75(samples, 4)).toBeCloseTo(75);
    expect(computeRollingP75(samples, 2)).toBeCloseTo(85);
    expect(computeRollingP75([], 2)).toBeNull();
  });

  it('caps the history size per metric', () => {
    for (let i = 0; i < MAX_HISTORY + 10; i += 1) {
      addRumSample({
        id: `INP-${i}`,
        name: 'INP',
        value: i,
        rating: getRating('INP', i),
        timestamp: i,
      });
    }

    const state = getRumState();
    expect(state.history.INP).toHaveLength(MAX_HISTORY);
    expect(state.history.INP[0].id).toBe(`INP-${10}`);
  });

  it('returns qualitative ratings for thresholds', () => {
    expect(getRating('FID', 80)).toBe('good');
    expect(getRating('FID', 220)).toBe('needs-improvement');
    expect(getRating('FID', 400)).toBe('poor');
    expect(getRating('INP', 150)).toBe('good');
    expect(getRating('INP', 300)).toBe('needs-improvement');
    expect(getRating('INP', 550)).toBe('poor');
  });
});
