import { act, renderHook, waitFor } from '@testing-library/react';
import type { FC, ReactNode } from 'react';
import { SafeModeProvider, useSafeMode } from '../hooks/useSafeMode';

type ObserverOptions = PerformanceObserverInit & { type?: string };

type ObserverCallback = (list: PerformanceObserverEntryList) => void;

class MockPerformanceObserver {
  public options?: ObserverOptions;
  private readonly callback: ObserverCallback;

  constructor(callback: ObserverCallback) {
    this.callback = callback;
  }

  observe(options: ObserverOptions) {
    this.options = options;
  }

  disconnect() {}

  takeRecords(): PerformanceEntryList {
    return [];
  }

  trigger(entries: PerformanceEntry[]) {
    const list: PerformanceObserverEntryList = {
      getEntries: () => entries,
      getEntriesByType: () => entries,
      getEntriesByName: () => entries,
    } as PerformanceObserverEntryList;
    this.callback(list);
  }
}

describe('SafeModeProvider', () => {
  const originalObserver = global.PerformanceObserver;
  let observers: MockPerformanceObserver[];

  beforeEach(() => {
    observers = [];
    jest.useFakeTimers();
    (global as any).PerformanceObserver = jest.fn((callback: ObserverCallback) => {
      const observer = new MockPerformanceObserver(callback);
      observers.push(observer);
      return observer;
    });
    Object.defineProperty(performance, 'memory', {
      value: { usedJSHeapSize: 128 * 1024 * 1024 },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    (global as any).PerformanceObserver = originalObserver;
    observers = [];
  });

  const wrapper: FC<{ children: ReactNode }> = ({ children }) => (
    <SafeModeProvider>{children}</SafeModeProvider>
  );

  const findObserver = (predicate: (observer: MockPerformanceObserver) => boolean) =>
    observers.find(predicate);

  it('activates safe mode when INP threshold is exceeded', async () => {
    const { result } = renderHook(() => useSafeMode(), { wrapper });

    const eventObserver = findObserver(
      (observer) => observer.options?.type === 'event' || observer.options?.entryTypes?.includes('event'),
    );
    expect(eventObserver).toBeDefined();

    act(() => {
      eventObserver?.trigger([
        {
          duration: 420,
          interactionId: 1,
        } as PerformanceEventTiming,
      ]);
    });

    await waitFor(() => {
      expect(result.current.safeModeActive).toBe(true);
    });
    expect(result.current.trigger?.reason).toBe('inp');
    expect(document.documentElement.getAttribute('data-safe-mode')).toBe('true');
  });

  it('activates safe mode when memory usage exceeds the threshold', async () => {
    const { result } = renderHook(() => useSafeMode(), { wrapper });

    const longTaskObserver = findObserver(
      (observer) => observer.options?.type === 'longtask' || observer.options?.entryTypes?.includes('longtask'),
    );
    expect(longTaskObserver).toBeDefined();

    (performance as any).memory.usedJSHeapSize = 400 * 1024 * 1024;

    act(() => {
      longTaskObserver?.trigger([
        {
          duration: 50,
          name: 'longtask',
        } as PerformanceEntry,
      ]);
    });

    await waitFor(() => {
      expect(result.current.safeModeActive).toBe(true);
    });
    expect(result.current.trigger?.reason).toBe('memory');
    expect(document.documentElement.getAttribute('data-safe-mode')).toBe('true');
  });

  it('supports manual override to disable safe mode', async () => {
    const { result } = renderHook(() => useSafeMode(), { wrapper });
    const eventObserver = findObserver(
      (observer) => observer.options?.type === 'event' || observer.options?.entryTypes?.includes('event'),
    );
    expect(eventObserver).toBeDefined();

    act(() => {
      eventObserver?.trigger([
        {
          duration: 320,
          interactionId: 2,
        } as PerformanceEventTiming,
      ]);
    });

    await waitFor(() => {
      expect(result.current.safeModeActive).toBe(true);
    });

    act(() => {
      result.current.disableSafeMode();
    });

    expect(result.current.safeModeActive).toBe(false);
    expect(result.current.manualOverride).toBe('forced-off');
    expect(document.documentElement.getAttribute('data-safe-mode')).toBeNull();
    expect(result.current.lastTrigger?.reason).toBe('inp');
  });
});
