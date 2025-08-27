import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import ResourceMonitor from '../components/apps/resource_monitor';

describe('ResourceMonitor', () => {
  let now = 0;
  let rafCb: FrameRequestCallback | null = null;

  beforeEach(() => {
    jest.useFakeTimers();
    now = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    Object.defineProperty(performance, 'memory', {
      value: { usedJSHeapSize: 1024 * 1024 },
      writable: true,
    });
    (window as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      rafCb = cb;
      return 1;
    };
    const cancel = () => {
      rafCb = null;
    };
    (window as any).cancelAnimationFrame = cancel;
    (global as any).cancelAnimationFrame = cancel;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('updates stats', () => {
    const { getByTestId } = render(<ResourceMonitor />);
    act(() => {
      now += 16;
      rafCb && rafCb(now);
      now += 120;
      jest.advanceTimersByTime(120);
    });
    expect(parseFloat(getByTestId('fps-value').textContent || '0')).toBeGreaterThan(0);
    expect(parseFloat(getByTestId('heap-value').textContent || '0')).toBeGreaterThan(0);
  });

  it('pausing freezes values', () => {
    const { getByTestId } = render(<ResourceMonitor />);
    act(() => {
      now += 16;
      rafCb && rafCb(now);
    });
    const fpsBefore = getByTestId('fps-value').textContent;
    fireEvent.click(getByTestId('pause-btn'));
    act(() => {
      now += 16;
      rafCb && rafCb(now);
      jest.advanceTimersByTime(200);
    });
    expect(getByTestId('fps-value').textContent).toBe(fpsBefore);
  });

  it('unmounts charts safely', () => {
    const cancelSpy = jest.spyOn(window as any, 'cancelAnimationFrame');
    const { unmount } = render(<ResourceMonitor />);
    expect(() => unmount()).not.toThrow();
    expect(cancelSpy).toHaveBeenCalled();
  });
});
