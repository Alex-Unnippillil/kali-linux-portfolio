import {
  FRAME_HISTORY_LIMIT,
  HEAP_HISTORY_LIMIT,
  TaskManagerStore,
} from '../components/apps/task-manager';

describe('TaskManagerStore', () => {
  it('tracks mount and unmount lifecycles with uptime', () => {
    const store = new TaskManagerStore();
    store.handleLifecycle({
      type: 'mount',
      id: 'win-1',
      title: 'Terminal',
      timestamp: 1_000,
    });

    let rows = store.getRows(1_500);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('Running');
    expect(rows[0].title).toBe('Terminal');
    expect(rows[0].uptimeMs).toBe(500);

    store.handleLifecycle({ type: 'unmount', id: 'win-1', timestamp: 2_500 });

    rows = store.getRows(3_000);
    expect(rows[0].status).toBe('Closed');
    expect(rows[0].uptimeMs).toBe(1_500);
  });

  it('aggregates requestAnimationFrame samples with history limits', () => {
    const store = new TaskManagerStore();
    store.handleLifecycle({ type: 'mount', id: 'win-frames', timestamp: 0 });

    const durations = Array.from(
      { length: FRAME_HISTORY_LIMIT + 5 },
      (_, i) => i + 1,
    );

    durations.forEach((duration, index) => {
      store.handleLifecycle({
        type: 'raf',
        id: 'win-frames',
        duration,
        timestamp: index + 1,
      });
    });

    const rows = store.getRows(durations.length + 10);
    expect(rows[0].frameSamples).toBe(FRAME_HISTORY_LIMIT);

    const expectedDurations = durations.slice(-FRAME_HISTORY_LIMIT);
    const expectedAverage =
      expectedDurations.reduce((acc, value) => acc + value, 0) /
      expectedDurations.length;

    expect(rows[0].avgFrame).toBeCloseTo(expectedAverage, 5);
    expect(rows[0].lastFrame).toBe(expectedDurations[expectedDurations.length - 1]);
  });

  it('records heap snapshots capped to a rolling window', () => {
    const store = new TaskManagerStore();
    store.handleLifecycle({ type: 'mount', id: 'win-heap', timestamp: 0 });

    const total = 50 * 1024 * 1024;

    for (let i = 0; i < HEAP_HISTORY_LIMIT + 2; i += 1) {
      store.handleLifecycle({
        type: 'heap',
        id: 'win-heap',
        usedJSHeapSize: (i + 1) * 1024 * 1024,
        totalJSHeapSize: total,
        timestamp: i * 1_000,
      });
    }

    const rows = store.getRows((HEAP_HISTORY_LIMIT + 2) * 1_000);
    expect(rows[0].heapSampleCount).toBe(HEAP_HISTORY_LIMIT);
    expect(rows[0].heapTotal).toBe(total);
    expect(rows[0].heapUsed).toBe((HEAP_HISTORY_LIMIT + 2) * 1024 * 1024);
    expect(rows[0].heapAgeMs).toBe(1_000);
  });

  it('resets runtime metrics when a window remounts', () => {
    const store = new TaskManagerStore();
    store.handleLifecycle({ type: 'mount', id: 'win-reset', timestamp: 0 });
    store.handleLifecycle({ type: 'raf', id: 'win-reset', duration: 16, timestamp: 10 });
    store.handleLifecycle({ type: 'unmount', id: 'win-reset', timestamp: 20 });
    store.handleLifecycle({ type: 'mount', id: 'win-reset', timestamp: 200 });

    const rows = store.getRows(250);
    expect(rows[0].status).toBe('Running');
    expect(rows[0].frameSamples).toBe(0);
    expect(rows[0].uptimeMs).toBe(50);
  });
});

