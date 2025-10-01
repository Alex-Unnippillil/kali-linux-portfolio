import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import ResourceMonitor from '../components/apps/resource_monitor';

describe('ResourceMonitor', () => {
  let observers: Map<Element, ResizeObserverCallback>;
  const originalDevicePixelRatio = window.devicePixelRatio;

  beforeEach(() => {
    observers = new Map();

    class ResizeObserverMock {
      callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }

      observe = (target: Element) => {
        observers.set(target, this.callback);
      };

      unobserve = (target: Element) => {
        observers.delete(target);
      };

      disconnect = () => {
        observers.clear();
      };

      takeRecords = () => [];
    }

    globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 1,
    });
  });

  afterEach(() => {
    delete (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: originalDevicePixelRatio,
    });
  });

  it('updates canvas dimensions in response to container resize events', async () => {
    render(<ResourceMonitor />);

    const container = await screen.findByTestId('resource-chart-cpu');
    await waitFor(() => {
      expect(observers.has(container)).toBe(true);
    });

    const callback = observers.get(container);
    expect(typeof callback).toBe('function');

    await act(async () => {
      callback?.([
        {
          target: container,
          contentRect: { width: 420, height: 160 },
        } as unknown as ResizeObserverEntry,
      ]);
    });

    const canvas = within(container).getByRole('img', { name: /cpu usage chart/i });
    await waitFor(() => {
      expect(Number(canvas.getAttribute('width'))).toBeGreaterThanOrEqual(420);
      expect(Number(canvas.getAttribute('height'))).toBeGreaterThanOrEqual(160);
    });
  });
});
