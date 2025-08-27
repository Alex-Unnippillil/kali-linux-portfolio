import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ResourceMonitor from '../components/apps/resource_monitor';

describe('ResourceMonitor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // requestAnimationFrame mock
    (global as any).requestAnimationFrame = (cb: any) => {
      return setTimeout(() => cb(performance.now()), 16);
    };
    (global as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
    // performance.now to track fake timers
    jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
    // memory info
    (performance as any).memory = {
      usedJSHeapSize: 50 * 1024 * 1024,
      totalJSHeapSize: 100 * 1024 * 1024,
    };
    // PerformanceObserver stub
    (global as any).PerformanceObserver = class {
      callback: any;
      constructor(cb: any) {
        this.callback = cb;
      }
      observe() {}
      disconnect() {}
    } as any;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('updates stats over time', () => {
    render(<ResourceMonitor />);
    expect(screen.getByTestId('fps-value').textContent).toBe('0.0');
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    const fps = Number(screen.getByTestId('fps-value').textContent);
    expect(fps).toBeGreaterThan(0);
  });

  it('pause freezes updates', () => {
    render(<ResourceMonitor />);
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    const before = screen.getByTestId('fps-value').textContent;
    fireEvent.click(screen.getByTestId('pause-btn'));
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('fps-value').textContent).toBe(before);
  });

  it('overlay toggles class', () => {
    render(<ResourceMonitor />);
    const root = screen.getByTestId('resource-root');
    expect(root.className).not.toMatch(/fixed/);
    fireEvent.click(screen.getByTestId('overlay-btn'));
    expect(root.className).toMatch(/fixed/);
  });
});

