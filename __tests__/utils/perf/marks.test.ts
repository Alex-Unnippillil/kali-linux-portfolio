import {
  beginInteractionMark,
  endInteractionMark,
  getInteractionSummary,
  recordINPMetric,
  resetInteractionHistoryForTests,
  setPerformanceImplementation,
} from '../../../utils/perf/marks';

interface PerformanceStub extends Performance {
  _setNextIncrement: (value: number) => void;
}

const installPerformanceStub = (): PerformanceStub => {
  let now = 0;
  let nextIncrement = 40;
  const defaultIncrement = 40;
  const marks = new Map<string, number>();
  const measures = new Map<string, number>();

  const stub: Partial<PerformanceStub> = {
    mark: jest.fn((name: string) => {
      now += nextIncrement;
      marks.set(name, now);
      nextIncrement = defaultIncrement;
    }),
    measure: jest.fn((measureName: string, startMark: string, endMark: string) => {
      const start = marks.get(startMark) ?? now;
      const end = marks.get(endMark) ?? now;
      const duration = Math.max(0, end - start);
      measures.set(measureName, duration);
    }),
    getEntriesByName: jest.fn((name: string) => {
      const duration = measures.get(name);
      return duration === undefined ? [] : [{ duration } as PerformanceEntry];
    }),
    clearMarks: jest.fn((name?: string) => {
      if (name) {
        marks.delete(name);
        return;
      }
      marks.clear();
    }),
    clearMeasures: jest.fn((name?: string) => {
      if (name) {
        measures.delete(name);
        return;
      }
      measures.clear();
    }),
    now: jest.fn(() => now),
    _setNextIncrement: (value: number) => {
      nextIncrement = value;
    },
  };

  return stub as PerformanceStub;
};

describe('interaction performance marks', () => {
  let perfStub: PerformanceStub;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    perfStub = installPerformanceStub();
    setPerformanceImplementation(perfStub);
    resetInteractionHistoryForTests();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    setPerformanceImplementation(null);
  });

  it('records user-blocking interactions', () => {
    const mark = beginInteractionMark('toggle-status', 'user-blocking');
    expect(mark).not.toBeNull();

    const record = endInteractionMark(mark, { detail: { origin: 'test' } });
    expect(record).not.toBeNull();
    expect(record?.detail).toEqual({ origin: 'test' });

    const summary = getInteractionSummary();
    expect(summary.recentInteractions).toHaveLength(1);
    expect(summary.recentInteractions[0].label).toBe('toggle-status');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns when user-blocking interactions exceed the budget', () => {
    const mark = beginInteractionMark('slow-toggle', 'user-blocking');
    expect(mark).not.toBeNull();
    perfStub._setNextIncrement(260);

    endInteractionMark(mark);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('interaction "slow-toggle" exceeded budget'),
    );
  });

  it('records INP metrics and flags regressions', () => {
    recordINPMetric(210, 'test-device');

    const summary = getInteractionSummary();
    expect(summary.lastINP).toBe(210);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('INP 210ms exceeded target'));
  });
});

