import React, { useRef } from 'react';
import { act, render, renderHook } from '@testing-library/react';
import useDataSaverPreference, {
  DATA_SAVER_EVENT,
  DATA_SAVER_STORAGE_KEY,
} from '../hooks/useDataSaverPreference';
import useIntersection from '../hooks/useIntersection';

const createMatchMedia = (matches: boolean) => {
  const listeners: Array<() => void> = [];
  return jest.fn().mockImplementation(() => ({
    matches,
    media: '(prefers-reduced-data: reduce)',
    addEventListener: (_: string, listener: () => void) => {
      listeners.push(listener);
    },
    removeEventListener: (_: string, listener: () => void) => {
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    },
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
};

describe('useDataSaverPreference', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-reduce-data');
    (window as any).matchMedia = createMatchMedia(false);
  });

  it('defaults to false when no preference is stored', () => {
    const { result } = renderHook(() => useDataSaverPreference());
    expect(result.current).toBe(false);
  });

  it('reads stored preference from localStorage', () => {
    window.localStorage.setItem(DATA_SAVER_STORAGE_KEY, JSON.stringify(true));
    const { result } = renderHook(() => useDataSaverPreference());
    expect(result.current).toBe(true);
  });

  it('responds to custom preference events', () => {
    const { result } = renderHook(() => useDataSaverPreference());
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(DATA_SAVER_EVENT, { detail: { enabled: true } }),
      );
    });

    expect(result.current).toBe(true);
  });

  it('updates when the storage event fires', () => {
    const { result } = renderHook(() => useDataSaverPreference());

    act(() => {
      window.localStorage.setItem(DATA_SAVER_STORAGE_KEY, JSON.stringify(true));
      const storageEvent = new StorageEvent('storage', {
        key: DATA_SAVER_STORAGE_KEY,
        newValue: JSON.stringify(true),
      });
      Object.defineProperty(storageEvent, 'storageArea', {
        value: window.localStorage,
      });
      window.dispatchEvent(storageEvent);
    });

    expect(result.current).toBe(true);
  });

  it('falls back to matchMedia when no stored preference exists', () => {
    const matchMedia = createMatchMedia(true);
    (window as any).matchMedia = matchMedia;
    const { result } = renderHook(() => useDataSaverPreference());
    expect(result.current).toBe(true);
  });
});

describe('useIntersection with data saver', () => {
  const observe = jest.fn();
  const disconnect = jest.fn();
  const intersectionObserverMock = jest
    .fn()
    .mockImplementation((_callback: IntersectionObserverCallback, options?: IntersectionObserverInit) => {
      return {
        observe,
        unobserve: jest.fn(),
        disconnect,
        takeRecords: jest.fn(),
        root: null,
        rootMargin: options?.rootMargin ?? '0px',
        thresholds: Array.isArray(options?.threshold)
          ? options?.threshold
          : options?.threshold !== undefined
            ? [options.threshold]
            : [0],
      };
    });

  beforeEach(() => {
    observe.mockClear();
    disconnect.mockClear();
    intersectionObserverMock.mockClear();
    (window as any).IntersectionObserver = intersectionObserverMock;
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-reduce-data');
    (window as any).matchMedia = createMatchMedia(false);
  });

  const TestComponent: React.FC<{ options?: IntersectionObserverInit }> = ({
    options,
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    useIntersection(ref, options);
    return <div ref={ref} />;
  };

  it('uses default observer options when data saver is disabled', () => {
    render(<TestComponent />);
    expect(intersectionObserverMock).toHaveBeenCalledTimes(1);
    expect(intersectionObserverMock.mock.calls[0][1]).toBeUndefined();
  });

  it('raises the threshold when data saver is enabled', () => {
    window.localStorage.setItem(DATA_SAVER_STORAGE_KEY, JSON.stringify(true));
    render(<TestComponent />);
    expect(intersectionObserverMock).toHaveBeenCalledTimes(1);
    expect(intersectionObserverMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ threshold: 0.6 }),
    );
  });

  it('clamps provided threshold values when data saver is enabled', () => {
    window.localStorage.setItem(DATA_SAVER_STORAGE_KEY, JSON.stringify(true));
    render(<TestComponent options={{ threshold: 0.1 }} />);
    expect(intersectionObserverMock.mock.calls[0][1]).toEqual({ threshold: 0.6 });
  });
});
