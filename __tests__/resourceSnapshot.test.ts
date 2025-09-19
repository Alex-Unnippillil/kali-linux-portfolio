import {
  captureResourceSnapshot,
  serializeResourceSnapshot,
  type ResourceSnapshot,
  type WindowSnapshot,
} from '../lib/resourceSnapshot';
import type { FetchEntry } from '../lib/fetchProxy';

describe('resourceSnapshot utilities', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    delete (window as any).__kaliResourceTimers;
    jest.restoreAllMocks();
  });

  it('serializes snapshots with circular references safely', () => {
    const windowEntry = {
      id: 'win-1',
      title: 'Window 1',
      className: '',
      state: { minimized: false, maximized: false, focused: true },
      zIndex: 1,
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      area: 10000,
      dataset: {},
      metrics: { cpu: null, memory: null },
    } as WindowSnapshot & { self?: unknown };
    windowEntry.self = windowEntry;

    const snapshot: ResourceSnapshot = {
      version: 1,
      capturedAt: new Date().toISOString(),
      metrics: { cpu: null, memory: null },
      windows: [windowEntry],
      timers: [],
    };

    expect(() => serializeResourceSnapshot(snapshot)).not.toThrow();
    const serialized = serializeResourceSnapshot(snapshot);
    expect(serialized).toContain('[Circular]');
  });

  it('captures DOM state, timers, and network metadata', async () => {
    class MockWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      postMessage() {
        this.onmessage?.({ data: { cpu: 80, memory: 50 } } as MessageEvent);
      }
      terminate() {}
    }
    const originalWorker = (global as any).Worker;
    (global as any).Worker = MockWorker;

    const getComputedStyleSpy = jest
      .spyOn(window, 'getComputedStyle')
      .mockImplementation((el: Element) => ({ zIndex: el.id === 'win-a' ? '10' : '5' }) as CSSStyleDeclaration);

    const createWindow = (
      id: string,
      title: string,
      rect: { x: number; y: number; width: number; height: number },
      className = 'main-window',
    ) => {
      const el = document.createElement('div');
      el.id = id;
      el.className = className;
      el.setAttribute('aria-label', title);
      (el as any).getBoundingClientRect = () => ({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.y,
        left: rect.x,
        right: rect.x + rect.width,
        bottom: rect.y + rect.height,
      });
      document.body.appendChild(el);
      return el;
    };

    createWindow('win-a', 'First', { x: 10, y: 10, width: 200, height: 200 });
    createWindow('win-b', 'Second', { x: 250, y: 40, width: 100, height: 150 }, 'main-window notFocused');

    (window as any).__kaliResourceTimers = {
      mode: 'timer',
      lastUpdated: 1234,
      timer: {
        running: true,
        remainingSeconds: 42,
        durationSeconds: 60,
        startTimestamp: 1000,
        endTimestamp: 1600,
      },
      stopwatch: {
        running: false,
        elapsedSeconds: 12,
        startTimestamp: null,
        laps: [3, 7],
      },
    };

    const networkHistory: FetchEntry[] = [
      {
        id: 1,
        url: 'https://example.com',
        method: 'GET',
        startTime: 0,
        endTime: 100,
        duration: 100,
        status: 200,
        requestSize: 42,
        responseSize: 84,
        fromServiceWorkerCache: false,
        error: new Error('Boom'),
      },
    ];

    const networkActive: FetchEntry[] = [
      {
        id: 2,
        url: 'https://api',
        method: 'POST',
        startTime: 5,
      },
    ];

    const snapshot = await captureResourceSnapshot({
      network: {
        history: networkHistory,
        active: networkActive,
      },
    });

    expect(snapshot.version).toBe(1);
    expect(snapshot.metrics.cpu).toBe(80);
    expect(snapshot.metrics.memory).toBe(50);
    expect(snapshot.windows).toHaveLength(2);
    expect(snapshot.windows[0].metrics.cpu).toBeGreaterThan(0);
    expect(snapshot.windows[1].state.focused).toBe(false);
    expect(snapshot.timers).toHaveLength(2);
    const timer = snapshot.timers.find((t) => t.id === 'timer');
    expect(timer?.remainingSeconds).toBe(42);
    expect(timer?.elapsedSeconds).toBe(18);
    const stopwatch = snapshot.timers.find((t) => t.id === 'stopwatch');
    expect(stopwatch?.laps).toEqual([3, 7]);
    expect(snapshot.network?.history[0].error).toMatchObject({ message: 'Boom' });
    expect(snapshot.network?.active[0].url).toBe('https://api');

    if (originalWorker) {
      (global as any).Worker = originalWorker;
    } else {
      delete (global as any).Worker;
    }
    getComputedStyleSpy.mockRestore();
  });
});
