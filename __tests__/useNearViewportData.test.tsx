import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import useNearViewportData from '@/hooks/useNearViewportData';

describe('useNearViewportData', () => {
  const originalIntersectionObserver = globalThis.IntersectionObserver;

  afterEach(() => {
    if (originalIntersectionObserver) {
      globalThis.IntersectionObserver = originalIntersectionObserver;
    } else {
      // @ts-ignore
      delete globalThis.IntersectionObserver;
    }
    jest.clearAllMocks();
  });

  const TestComponent: React.FC<{ onPreload: jest.Mock; immediate?: boolean }>
    = ({ onPreload, immediate = false }) => {
      const { ref, hasTriggered, trigger } = useNearViewportData<HTMLDivElement>(
        onPreload,
        { rootMargin: '0px', immediate },
      );

      return (
        <div>
          <div data-testid="target" ref={ref} />
          <span data-testid="status">{hasTriggered ? 'true' : 'false'}</span>
          <button type="button" onClick={trigger}>
            manual
          </button>
        </div>
      );
    };

  it('invokes preload when the element intersects the viewport', () => {
    const observe = jest.fn();
    const disconnect = jest.fn();
    let callback: IntersectionObserverCallback | null = null;
    const mockIntersectionObserver = jest.fn((cb: IntersectionObserverCallback) => {
      callback = cb;
      return {
        observe,
        disconnect,
        unobserve: jest.fn(),
        takeRecords: jest.fn(),
      } as unknown as IntersectionObserver;
    });
    (globalThis as any).IntersectionObserver = mockIntersectionObserver;

    const preload = jest.fn();
    render(<TestComponent onPreload={preload} />);

    expect(observe).toHaveBeenCalledTimes(1);
    expect(preload).not.toHaveBeenCalled();

    act(() => {
      callback?.([
        {
          isIntersecting: true,
          intersectionRatio: 1,
        } as IntersectionObserverEntry,
      ], {} as IntersectionObserver);
    });

    expect(preload).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('status').textContent).toBe('true');
    expect(disconnect).toHaveBeenCalled();
  });

  it('falls back to immediate preload when IntersectionObserver is unavailable', () => {
    // @ts-ignore
    delete globalThis.IntersectionObserver;
    const preload = jest.fn();

    render(<TestComponent onPreload={preload} />);

    expect(preload).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('status').textContent).toBe('true');
  });

  it('allows manual triggering via the returned trigger function', () => {
    const observe = jest.fn();
    const disconnect = jest.fn();
    let callback: IntersectionObserverCallback | null = null;
    const mockIntersectionObserver = jest.fn((cb: IntersectionObserverCallback) => {
      callback = cb;
      return {
        observe,
        disconnect,
        unobserve: jest.fn(),
        takeRecords: jest.fn(),
      } as unknown as IntersectionObserver;
    });
    (globalThis as any).IntersectionObserver = mockIntersectionObserver;

    const preload = jest.fn();
    render(<TestComponent onPreload={preload} />);

    fireEvent.click(screen.getByText('manual'));

    expect(preload).toHaveBeenCalledTimes(1);

    act(() => {
      callback?.([
        {
          isIntersecting: true,
          intersectionRatio: 1,
        } as IntersectionObserverEntry,
      ], {} as IntersectionObserver);
    });

    expect(preload).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalled();
  });
});
