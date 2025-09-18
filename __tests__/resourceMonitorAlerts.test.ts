import { createAlertManager, pushRingBuffer } from '../components/apps/resource_monitor';

describe('resource monitor alerts', () => {
  it('throttles alerts within the configured window', () => {
    const events: Array<{ metric: string; timestamp: number }> = [];
    let now = 0;
    const manager = createAlertManager(
      {
        cpu: { limit: 80, debounceMs: 5000 },
        mem: { limit: 70, debounceMs: 4000 },
      },
      (event) => {
        events.push({ metric: event.metric, timestamp: event.timestamp });
      },
      () => now,
    );

    now = 1000;
    manager.evaluate({ cpu: 90, mem: 0 });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ metric: 'cpu', timestamp: 1000 });

    now = 1500;
    manager.evaluate({ cpu: 95, mem: 0 });
    expect(events).toHaveLength(1);

    now = 2500;
    manager.evaluate({ cpu: 20, mem: 0 });
    expect(events).toHaveLength(1);

    now = 4000;
    manager.evaluate({ cpu: 85, mem: 0 });
    expect(events).toHaveLength(1);

    now = 7000;
    manager.evaluate({ cpu: 88, mem: 0 });
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ metric: 'cpu', timestamp: 7000 });
  });

  it('maintains a bounded alert log buffer', () => {
    const limit = 3;
    const makeEntry = (n: number) => ({ id: String(n), message: `entry-${n}`, timestamp: n });
    let buffer: Array<{ id: string; message: string; timestamp: number }> = [];

    buffer = pushRingBuffer(buffer, makeEntry(1), limit);
    buffer = pushRingBuffer(buffer, makeEntry(2), limit);
    buffer = pushRingBuffer(buffer, makeEntry(3), limit);
    buffer = pushRingBuffer(buffer, makeEntry(4), limit);

    expect(buffer).toHaveLength(limit);
    expect(buffer[0]).toMatchObject({ message: 'entry-2' });
    expect(buffer[buffer.length - 1]).toMatchObject({ message: 'entry-4' });
  });
});
